// Prints a /api/auth/callback URL that signs in demo@picohealth.app (admin generateLink; no email sent). Approved by the user 2026-11-16.
const fs = require("fs");
const env = Object.fromEntries(fs.readFileSync("/Users/health-bean/Coding/pico-health-redesign/.env.local", "utf8").split("\n").filter(l => l.includes("=") && !l.startsWith("#")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
(async () => {
  const r = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/admin/generate_link", {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", email: "demo@picohealth.app" }),
  });
  const j = await r.json();
  const token = j.hashed_token || (j.properties && j.properties.hashed_token);
  if (!token) { console.error(r.status, JSON.stringify(j).slice(0, 200)); process.exit(1); }
  console.log(`/api/auth/callback?token_hash=${token}&type=magiclink&next=/log`);
})();
