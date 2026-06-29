import { createHash, randomBytes, randomUUID, verify as nodeVerify } from "crypto";
import { getBaseUrl } from "@/lib/env";

const enc = new TextEncoder();
export const PASSKEY_LOGIN_TOKEN_PREFIX = "passkey:";
export const passkeyStrongAuthNote = "Passkey sign-in is treated as phishing-resistant strong authentication and satisfies the second factor; password sign-in still requires TOTP when enabled.";

export function b64url(input: Buffer | ArrayBuffer | Uint8Array) {
  return Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input).toString("base64url");
}
export function fromB64url(value: string) { return Buffer.from(value, "base64url"); }
export function sha256(input: Buffer | string) { return createHash("sha256").update(input).digest(); }
export function getWebAuthnConfig() {
  const base = new URL(getBaseUrl());
  const rpID = (process.env.WEBAUTHN_RP_ID || base.hostname).trim();
  const origins = (process.env.WEBAUTHN_ORIGINS || process.env.WEBAUTHN_ORIGIN || getBaseUrl())
    .split(",").map((v) => v.trim()).filter(Boolean);
  return { rpName: process.env.WEBAUTHN_RP_NAME || "Kurioticket", rpID, origins };
}
export function assertAllowedOrigin(origin: string) {
  const { origins } = getWebAuthnConfig();
  if (!origins.includes(origin)) throw new Error("Origin is not allowed for passkey authentication.");
}
export function newChallenge() { return b64url(randomBytes(32)); }
export function newPasskeyLoginToken() { return `${PASSKEY_LOGIN_TOKEN_PREFIX}${randomUUID()}:${b64url(randomBytes(32))}`; }
export function isPasskeyLoginToken(value: string) { return value.startsWith(PASSKEY_LOGIN_TOKEN_PREFIX); }
export function credentialIdToBytes(id: string) { return fromB64url(id); }

function readCbor(data: Buffer, offset = 0): [unknown, number] {
  const first = data[offset++]; const major = first >> 5; const ai = first & 31; let len = ai;
  if (ai === 24) len = data[offset++]; else if (ai === 25) { len = data.readUInt16BE(offset); offset += 2; }
  else if (ai === 26) { len = data.readUInt32BE(offset); offset += 4; } else if (ai >= 27) throw new Error("Unsupported CBOR");
  if (major === 0) return [len, offset];
  if (major === 1) return [-1 - len, offset];
  if (major === 2) { const v = data.subarray(offset, offset + len); return [v, offset + len]; }
  if (major === 3) { const v = data.subarray(offset, offset + len).toString("utf8"); return [v, offset + len]; }
  if (major === 4) { const a=[]; for(let i=0;i<len;i++){ const r=readCbor(data,offset); a.push(r[0]); offset=r[1]; } return [a, offset]; }
  if (major === 5) { const m = new Map<unknown, unknown>(); for(let i=0;i<len;i++){ const k=readCbor(data,offset); offset=k[1]; const v=readCbor(data,offset); offset=v[1]; m.set(k[0],v[0]); } return [m, offset]; }
  if (major === 7) return [ai === 20 ? false : ai === 21 ? true : null, offset];
  throw new Error("Unsupported CBOR");
}
function coseToJwk(cose: Buffer) {
  const [decoded] = readCbor(cose); if (!(decoded instanceof Map)) throw new Error("Invalid public key");
  const kty = decoded.get(1), alg = decoded.get(3), crv = decoded.get(-1), x = decoded.get(-2), y = decoded.get(-3);
  if (kty !== 2 || alg !== -7 || crv !== 1 || !Buffer.isBuffer(x) || !Buffer.isBuffer(y)) throw new Error("Only ES256 passkeys are supported.");
  return JSON.stringify({ kty: "EC", crv: "P-256", x: b64url(x), y: b64url(y), ext: true });
}
export function parseAuthenticatorData(authDataB64: string) {
  const authData = fromB64url(authDataB64); if (authData.length < 37) throw new Error("Invalid authenticator data");
  const rpIdHash = authData.subarray(0, 32); const flags = authData[32]; const counter = authData.readUInt32BE(33);
  return { authData, rpIdHash, flags, counter };
}
export function parseRegistrationAuthData(authDataB64: string) {
  const parsed = parseAuthenticatorData(authDataB64); if (!(parsed.flags & 0x40)) throw new Error("Missing attested credential data");
  let offset = 37 + 16; const credentialIdLength = parsed.authData.readUInt16BE(offset); offset += 2;
  const credentialId = parsed.authData.subarray(offset, offset + credentialIdLength); offset += credentialIdLength;
  const cose = parsed.authData.subarray(offset); const publicKey = coseToJwk(cose);
  return { ...parsed, credentialId: b64url(credentialId), publicKey };
}
export function verifyAssertionSignature(args: { publicKey: string; authenticatorData: string; clientDataJSON: string; signature: string }) {
  const data = Buffer.concat([fromB64url(args.authenticatorData), sha256(fromB64url(args.clientDataJSON))]);
  return nodeVerify("SHA256", data, { key: JSON.parse(args.publicKey), format: "jwk" }, fromB64url(args.signature));
}
export function parseClientData(clientDataJSON: string) { return JSON.parse(fromB64url(clientDataJSON).toString("utf8")); }
export function userHandle(userId: string) { return b64url(enc.encode(userId)); }
