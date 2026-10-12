import { createSign, sign as cryptoSign } from "node:crypto";
import { connect } from "node:http2";

/**
 * Push delivery for the post-meal check-in. iOS goes straight to APNs and
 * Android to FCM, signed with Node's own crypto: no SDKs, no new
 * dependencies.
 *
 * Inert until credentials exist. With none set, every send reports
 * `skipped`, so this ships safely before the Apple and Firebase accounts
 * are set up:
 *   APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (the .p8 contents),
 *   APNS_BUNDLE_ID (default com.picohealth.app), APNS_SANDBOX=1 for dev builds
 *   FCM_SERVICE_ACCOUNT (the service-account JSON, one line)
 */

export type Platform = "ios" | "android";

export interface PushMessage {
  title: string;
  body: string;
  /** Path the app opens when the notification is tapped. */
  url: string;
}

/** `invalid` means the token is dead and should be deleted. */
export type SendResult = "sent" | "invalid" | "skipped" | "error";

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

const pem = (key: string) => key.replace(/\\n/g, "\n");

export function pushConfigured(platform: Platform): boolean {
  if (platform === "ios") {
    return Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY);
  }
  return Boolean(process.env.FCM_SERVICE_ACCOUNT);
}

// ── APNs ─────────────────────────────────────────────────────────────

/** ES256 provider token. Apple accepts one for up to an hour. */
export function apnsJwt(keyId: string, teamId: string, privateKey: string, now = Date.now()): string {
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(now / 1000) }));
  const signature = cryptoSign("sha256", Buffer.from(`${header}.${claims}`), {
    key: pem(privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${claims}.${b64url(signature)}`;
}

let apnsToken: { value: string; at: number } | null = null;

async function sendApns(deviceToken: string, msg: PushMessage): Promise<SendResult> {
  const { APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY } = process.env;
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_PRIVATE_KEY) return "skipped";
  if (!apnsToken || Date.now() - apnsToken.at > 50 * 60_000) {
    apnsToken = { value: apnsJwt(APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY), at: Date.now() };
  }
  const host = process.env.APNS_SANDBOX === "1" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const payload = JSON.stringify({ aps: { alert: { title: msg.title, body: msg.body }, sound: "default" }, url: msg.url });

  return new Promise<SendResult>((resolve) => {
    const client = connect(host);
    client.on("error", () => resolve("error"));
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${apnsToken!.value}`,
      "apns-topic": process.env.APNS_BUNDLE_ID || "com.picohealth.app",
      "apns-push-type": "alert",
      "content-type": "application/json",
    });
    let status = 0;
    let body = "";
    req.on("response", (h) => (status = Number(h[":status"])));
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      client.close();
      if (status === 200) return resolve("sent");
      // 410: token no longer active. 400 BadDeviceToken: never valid for this topic.
      if (status === 410 || (status === 400 && body.includes("BadDeviceToken"))) return resolve("invalid");
      resolve("error");
    });
    req.on("error", () => {
      client.close();
      resolve("error");
    });
    req.end(payload);
  });
}

// ── FCM (HTTP v1) ────────────────────────────────────────────────────

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

let fcmToken: { value: string; expires: number } | null = null;

async function fcmAccessToken(sa: ServiceAccount): Promise<string> {
  if (fcmToken && fcmToken.expires > Date.now() + 60_000) return fcmToken.value;
  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(pem(sa.private_key)))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`FCM auth ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  fcmToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function sendFcm(deviceToken: string, msg: PushMessage): Promise<SendResult> {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return "skipped";
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await fcmAccessToken(sa)}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { token: deviceToken, notification: { title: msg.title, body: msg.body }, data: { url: msg.url } },
      }),
    });
    if (res.ok) return "sent";
    // 404 UNREGISTERED: the app was uninstalled or the token rotated.
    if (res.status === 404 || res.status === 400) {
      const text = await res.text();
      if (text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT")) return "invalid";
    }
    return "error";
  } catch {
    return "error";
  }
}

export function sendPush(platform: Platform, deviceToken: string, msg: PushMessage): Promise<SendResult> {
  return platform === "ios" ? sendApns(deviceToken, msg) : sendFcm(deviceToken, msg);
}
