import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPairSync, verify } from 'node:crypto';
import { apnsJwt, pushConfigured, sendPush } from './send';

describe('APNs provider token', () => {
  it('is an ES256 JWT that verifies against the key that signed it', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const jwt = apnsJwt('KEY123', 'TEAM456', pem, 1_760_000_000_000);
    const [h, c, s] = jwt.split('.');
    const decode = (x: string) => JSON.parse(Buffer.from(x, 'base64url').toString());
    expect(decode(h)).toEqual({ alg: 'ES256', kid: 'KEY123' });
    expect(decode(c)).toEqual({ iss: 'TEAM456', iat: 1_760_000_000 });
    const ok = verify('sha256', Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
    expect(ok).toBe(true);
  });

  it('accepts a key pasted with literal \\n, the way env vars hold it', () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const oneLine = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().replace(/\n/g, '\\n');
    expect(apnsJwt('K', 'T', oneLine).split('.')).toHaveLength(3);
  });
});

describe('without credentials', () => {
  beforeEach(() => {
    for (const k of ['APNS_KEY_ID', 'APNS_TEAM_ID', 'APNS_PRIVATE_KEY', 'FCM_SERVICE_ACCOUNT']) delete process.env[k];
  });

  it('reports itself unconfigured and skips every send, so it is safe to ship first', async () => {
    expect(pushConfigured('ios')).toBe(false);
    expect(pushConfigured('android')).toBe(false);
    expect(await sendPush('ios', 'tok', { title: 't', body: 'b', url: '/log' })).toBe('skipped');
    expect(await sendPush('android', 'tok', { title: 't', body: 'b', url: '/log' })).toBe('skipped');
  });
});
