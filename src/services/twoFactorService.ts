import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AuthenticationAssurance } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";

const method = "TOTP";
const issuer = "Kurioticket";
const period = 30;
const digits = 6;
const setupTtlMs = 10 * 60 * 1000;
const recoveryCodeCount = 10;
const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export type TwoFactorPurpose = "login" | "setup" | "disable";

export async function getTwoFactorStatus(userId: string) {
  const settings = await getPrisma().userSecuritySettings.findUnique({
    where: { userId },
    select: { twoFactorEnabled: true, twoFactorMethod: true, twoFactorEnabledAt: true, twoFactorDisabledAt: true, recoveryCodesHash: true },
  });
  const recoveryCodes = parseRecoveryCodeHashes(settings?.recoveryCodesHash);
  return {
    enabled: Boolean(settings?.twoFactorEnabled),
    method: settings?.twoFactorMethod || (settings?.twoFactorEnabled ? method : null),
    enabledAt: settings?.twoFactorEnabledAt?.toISOString() ?? null,
    disabledAt: settings?.twoFactorDisabledAt?.toISOString() ?? null,
    recoveryCodesRemaining: recoveryCodes.length,
  };
}

export async function isTwoFactorEnabledForUser(userId: string) {
  const settings = await getPrisma().userSecuritySettings.findUnique({ where: { userId }, select: { twoFactorEnabled: true } });
  return Boolean(settings?.twoFactorEnabled);
}

export async function createTotpSetup(input: { userId: string; email?: string | null }) {
  const secret = toBase32(randomBytes(20));
  const encrypted = encryptSecret(secret);
  const identifier = setupIdentifier(input.userId);
  await getPrisma().verificationToken.deleteMany({ where: { identifier } });
  await getPrisma().verificationToken.create({ data: { identifier, token: encrypted, expires: new Date(Date.now() + setupTtlMs) } });
  const label = encodeURIComponent(input.email || `user-${input.userId}`);
  const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${digits}&period=${period}`;
  return { otpauthUri, manualSetupKey: secret, expiresAt: new Date(Date.now() + setupTtlMs).toISOString() };
}

export async function confirmTotpSetup(input: { userId: string; accountSessionId: string; code: string }) {
  const pending = await getPrisma().verificationToken.findFirst({ where: { identifier: setupIdentifier(input.userId) }, orderBy: { expires: "desc" } });
  if (!pending || pending.expires <= new Date()) return null;
  const secret = decryptSecret(pending.token).secret;
  const result = verifyTotp(secret, input.code);
  if (!result.valid) return null;
  const recoveryCodes = generateRecoveryCodes();
  const now = new Date();
  const securityEvent = await getPrisma().$transaction(async (tx) => {
    await tx.userSecuritySettings.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId, twoFactorEnabled: true, twoFactorMethod: method, twoFactorSecretEncrypted: pending.token, twoFactorLastUsedStep: BigInt(result.step), recoveryCodesHash: JSON.stringify(recoveryCodes.map(hashRecoveryCode)), twoFactorEnabledAt: now, twoFactorDisabledAt: null },
      update: { twoFactorEnabled: true, twoFactorMethod: method, twoFactorSecretEncrypted: pending.token, twoFactorLastUsedStep: BigInt(result.step), recoveryCodesHash: JSON.stringify(recoveryCodes.map(hashRecoveryCode)), twoFactorEnabledAt: now, twoFactorDisabledAt: null },
    });
    await tx.accountSession.update({ where: { id: input.accountSessionId }, data: { assuranceLevel: "MFA", twoFactorVerifiedAt: now, reauthenticatedAt: now } });
    await tx.accountSession.updateMany({ where: { userId: input.userId, id: { not: input.accountSessionId }, revokedAt: null }, data: { revokedAt: now, revokeReason: "two_factor_enabled_other_device" } });
    await tx.verificationToken.deleteMany({ where: { identifier: setupIdentifier(input.userId) } });
    return tx.securityEvent.create({ data: { userId: input.userId, accountSessionId: input.accountSessionId, type: "TWO_FACTOR_ENABLED", assuranceLevel: "MFA" } });
  });
  return { recoveryCodes, securityEvent };
}

export async function verifySecondFactor(input: { userId: string; code: string; consumeRecoveryCode?: boolean }) {
  const code = input.code.trim().toUpperCase();
  const settings = await getPrisma().userSecuritySettings.findUnique({ where: { userId: input.userId }, select: { twoFactorEnabled: true, twoFactorSecretEncrypted: true, twoFactorLastUsedStep: true, recoveryCodesHash: true } });
  if (!settings?.twoFactorEnabled) return false;
  if (/^\d{6}$/.test(code) && settings.twoFactorSecretEncrypted) {
    const decrypted = decryptSecret(settings.twoFactorSecretEncrypted);
    const result = verifyTotp(decrypted.secret, code);
    if (result.valid && (!settings.twoFactorLastUsedStep || BigInt(result.step) > settings.twoFactorLastUsedStep)) {
      await getPrisma().userSecuritySettings.update({ where: { userId: input.userId }, data: { twoFactorLastUsedStep: BigInt(result.step), ...(decrypted.legacy && hasDedicatedEncryptionKey() ? { twoFactorSecretEncrypted: encryptSecret(decrypted.secret) } : {}) } });
      return true;
    }
  }
  const recoveryHashes = parseRecoveryCodeHashes(settings.recoveryCodesHash);
  const recoveryHash = hashRecoveryCode(code);
  const index = recoveryHashes.findIndex((stored) => safeEqual(stored, recoveryHash));
  if (index >= 0) {
    if (input.consumeRecoveryCode !== false) {
      recoveryHashes.splice(index, 1);
      await getPrisma().userSecuritySettings.update({ where: { userId: input.userId }, data: { recoveryCodesHash: JSON.stringify(recoveryHashes) } });
    }
    return true;
  }
  return false;
}

export async function disableTwoFactor(userId: string) {
  const now = new Date();
  return getPrisma().userSecuritySettings.upsert({
    where: { userId },
    create: { userId, twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecretEncrypted: null, twoFactorLastUsedStep: null, recoveryCodesHash: null, twoFactorDisabledAt: now },
    update: { twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecretEncrypted: null, twoFactorLastUsedStep: null, recoveryCodesHash: null, twoFactorDisabledAt: now },
  });
}

export async function disableTwoFactorForSession(input: { userId: string; accountSessionId: string; assuranceLevel: AuthenticationAssurance }) {
  const now = new Date();
  return getPrisma().$transaction(async tx => {
    await tx.userSecuritySettings.update({ where: { userId: input.userId }, data: { twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecretEncrypted: null, twoFactorLastUsedStep: null, recoveryCodesHash: null, twoFactorDisabledAt: now } });
    await tx.accountSession.update({ where: { id: input.accountSessionId }, data: { reauthenticatedAt: now } });
    await tx.accountSession.updateMany({ where: { userId: input.userId, id: { not: input.accountSessionId }, revokedAt: null }, data: { revokedAt: now, revokeReason: "two_factor_disabled_other_device" } });
    return tx.securityEvent.create({ data: { userId: input.userId, accountSessionId: input.accountSessionId, type: "TWO_FACTOR_DISABLED", assuranceLevel: input.assuranceLevel } });
  });
}

export async function regenerateRecoveryCodes(input: { userId: string; accountSessionId: string; code: string }) {
  if (!(await verifySecondFactor({ userId: input.userId, code: input.code, consumeRecoveryCode: false }))) return null;
  const recoveryCodes = generateRecoveryCodes();
  const securityEvent = await getPrisma().$transaction(async tx => {
    await tx.userSecuritySettings.update({ where: { userId: input.userId }, data: { recoveryCodesHash: JSON.stringify(recoveryCodes.map(hashRecoveryCode)) } });
    await tx.accountSession.update({ where: { id: input.accountSessionId }, data: { reauthenticatedAt: new Date(), twoFactorVerifiedAt: new Date(), assuranceLevel: "MFA" } });
    return tx.securityEvent.create({ data: { userId: input.userId, accountSessionId: input.accountSessionId, type: "RECOVERY_CODES_REGENERATED", assuranceLevel: "MFA" } });
  });
  return { recoveryCodes, securityEvent };
}

function setupIdentifier(userId: string) { return `two-factor:totp-setup:${userId}`; }
function deriveKey(value: string) { return createHash("sha256").update(value).digest(); }
function hasDedicatedEncryptionKey() { return Boolean(process.env.ACCOUNT_SECURITY_ENCRYPTION_KEY && process.env.ACCOUNT_SECURITY_ENCRYPTION_KEY.length >= 32); }
function currentEncryptionKey() {
  const configured = process.env.ACCOUNT_SECURITY_ENCRYPTION_KEY;
  if (configured && configured.length >= 32) return deriveKey(configured);
  if (process.env.NODE_ENV === "production") throw new Error("Account security encryption is unavailable.");
  return deriveKey("development-account-security-key");
}
function legacyKeys() {
  const values = [process.env.ACCOUNT_SECURITY_ENCRYPTION_KEY, process.env.ACCOUNT_SECURITY_LEGACY_ENCRYPTION_KEY, process.env.NEXTAUTH_SECRET, process.env.AUTH_SECRET];
  if (process.env.NODE_ENV !== "production") values.push("development-account-security-key");
  return [...new Set(values.filter((value): value is string => Boolean(value)))].map(deriveKey);
}
export function encryptSecret(value: string) { const iv=randomBytes(12); const cipher=createCipheriv("aes-256-gcm", currentEncryptionKey(), iv); const encrypted=Buffer.concat([cipher.update(value,"utf8"), cipher.final()]); const tag=cipher.getAuthTag(); return `v2:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`; }
export function decryptSecret(value: string) {
  const [version,iv,tag,data]=value.split(":");
  if (!iv || !tag || !data || !["v1","v2"].includes(version)) throw new Error("Invalid encrypted account security data.");
  const keys = version === "v2" ? [currentEncryptionKey()] : legacyKeys();
  for (const key of keys) { try { const decipher=createDecipheriv("aes-256-gcm", key, Buffer.from(iv,"base64url")); decipher.setAuthTag(Buffer.from(tag,"base64url")); return { secret: Buffer.concat([decipher.update(Buffer.from(data,"base64url")), decipher.final()]).toString("utf8"), legacy: version === "v1" }; } catch {} }
  throw new Error("Unable to decrypt account security data.");
}
function toBase32(buf: Buffer) { let bits="", out=""; for (const b of buf) bits += b.toString(2).padStart(8,"0"); for (let i=0;i<bits.length;i+=5) out += base32Alphabet[parseInt(bits.slice(i,i+5).padEnd(5,"0"),2)]; return out; }
function fromBase32(input: string) { let bits=""; for (const c of input.replace(/=+$/,"")) bits += base32Alphabet.indexOf(c).toString(2).padStart(5,"0"); const bytes=[]; for (let i=0;i+8<=bits.length;i+=8) bytes.push(parseInt(bits.slice(i,i+8),2)); return Buffer.from(bytes); }
function verifyTotp(secret: string, code: string) { if (!/^\d{6}$/.test(code)) return { valid:false, step:0 }; const current=Math.floor(Date.now()/1000/period); for (const step of [current-1,current,current+1]) if (safeEqual(totpAt(secret, step), code)) return { valid:true, step }; return { valid:false, step:0 }; }
function totpAt(secret: string, step: number) { const counter=Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step)); const hmac=createHmac("sha1", fromBase32(secret)).update(counter).digest(); const offset=hmac[hmac.length-1]&0xf; const bin=((hmac[offset]&0x7f)<<24)|(hmac[offset+1]<<16)|(hmac[offset+2]<<8)|hmac[offset+3]; return String(bin % 10 ** digits).padStart(digits,"0"); }
function generateRecoveryCodes() { return Array.from({length: recoveryCodeCount}, () => `${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`); }
function hashRecoveryCode(code: string) { return createHash("sha256").update(`recovery:${code.replace(/\s+/g,"").toUpperCase()}`).digest("hex"); }
function parseRecoveryCodeHashes(value?: string | null) { if (!value) return []; try { const parsed=JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []; } catch { return []; } }
function safeEqual(a: string, b: string) { const ab=Buffer.from(a); const bb=Buffer.from(b); return ab.length === bb.length && timingSafeEqual(ab, bb); }
