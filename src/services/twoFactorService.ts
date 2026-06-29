import { createHash, randomInt } from "node:crypto";
import { EmailDeliveryError, sendTransactionalEmail, twoFactorCodeEmail } from "@/services/emailService";
import { getPrisma } from "@/lib/prisma";

const twoFactorCodeTtlMinutes = 10;
const resendCooldownMs = 60 * 1000;
const resendCooldowns = new Map<string, number>();

export type TwoFactorPurpose = "enable" | "disable" | "login";

export class TwoFactorCooldownError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("Please wait before requesting another two-factor code.");
    this.name = "TwoFactorCooldownError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function getTwoFactorStatus(userId: string) {
  const settings = await getPrisma().userSecuritySettings.findUnique({
    where: { userId },
    select: { twoFactorEnabled: true, twoFactorMethod: true, twoFactorEnabledAt: true, twoFactorDisabledAt: true },
  });

  return {
    enabled: Boolean(settings?.twoFactorEnabled),
    method: settings?.twoFactorMethod || (settings?.twoFactorEnabled ? "email" : null),
    enabledAt: settings?.twoFactorEnabledAt?.toISOString() ?? null,
    disabledAt: settings?.twoFactorDisabledAt?.toISOString() ?? null,
  };
}

export async function isTwoFactorEnabledForUser(userId: string) {
  const settings = await getPrisma().userSecuritySettings.findUnique({ where: { userId }, select: { twoFactorEnabled: true } });
  return Boolean(settings?.twoFactorEnabled);
}

export async function sendTwoFactorCode(input: { userId: string; email: string; name?: string | null; purpose: TwoFactorPurpose }) {
  const email = input.email.toLowerCase().trim();
  const identifier = getTwoFactorIdentifier(input.purpose, input.userId);
  reserveResendCooldown(identifier);

  const code = randomInt(100000, 1000000).toString();
  const token = hashTwoFactorCode(input.userId, input.purpose, code);
  const expires = new Date(Date.now() + twoFactorCodeTtlMinutes * 60 * 1000);

  try {
    await getPrisma().verificationToken.deleteMany({ where: { identifier } });
    await getPrisma().verificationToken.create({ data: { identifier, token, expires } });
    await sendTransactionalEmail({
      to: email,
      subject: "Your Kurioticket two-factor authentication code",
      html: twoFactorCodeEmail({ code, name: input.name, purpose: input.purpose, expiresInMinutes: twoFactorCodeTtlMinutes }),
      idempotencyKey: `two-factor-${input.purpose}-${input.userId}-${token.slice(0, 16)}`,
      requireConfigured: true,
    });
    console.info("[two-factor:code-sent]", { purpose: input.purpose, userId: input.userId });
    return { cooldownSeconds: getRemainingCooldownSeconds(identifier) || getCooldownSeconds() };
  } catch (error) {
    clearResendCooldown(identifier);
    console.error("[two-factor:code-failed]", {
      purpose: input.purpose,
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error),
      status: error instanceof EmailDeliveryError ? error.statusCode : undefined,
    });
    throw error;
  }
}

export async function verifyTwoFactorCode(input: { userId: string; purpose: TwoFactorPurpose; code: string }) {
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) return false;

  const identifier = getTwoFactorIdentifier(input.purpose, input.userId);
  const token = hashTwoFactorCode(input.userId, input.purpose, code);
  const verificationToken = await getPrisma().verificationToken.findUnique({ where: { identifier_token: { identifier, token } } });

  if (!verificationToken || verificationToken.expires <= new Date()) {
    if (verificationToken) await getPrisma().verificationToken.deleteMany({ where: { identifier, token } });
    return false;
  }

  await getPrisma().verificationToken.deleteMany({ where: { identifier } });
  return true;
}

export async function enableTwoFactor(userId: string) {
  const now = new Date();
  return getPrisma().userSecuritySettings.upsert({
    where: { userId },
    create: { userId, twoFactorEnabled: true, twoFactorMethod: "email", twoFactorEnabledAt: now, twoFactorDisabledAt: null },
    update: { twoFactorEnabled: true, twoFactorMethod: "email", twoFactorEnabledAt: now, twoFactorDisabledAt: null },
  });
}

export async function disableTwoFactor(userId: string) {
  const now = new Date();
  return getPrisma().userSecuritySettings.upsert({
    where: { userId },
    create: { userId, twoFactorEnabled: false, twoFactorMethod: null, twoFactorDisabledAt: now },
    update: { twoFactorEnabled: false, twoFactorMethod: null, twoFactorDisabledAt: now },
  });
}

function reserveResendCooldown(key: string) {
  const retryAfterSeconds = getRemainingCooldownSeconds(key);
  if (retryAfterSeconds > 0) throw new TwoFactorCooldownError(retryAfterSeconds);
  resendCooldowns.set(key, Date.now());
}
function clearResendCooldown(key: string) { resendCooldowns.delete(key); }
function getRemainingCooldownSeconds(key: string) {
  const lastSentAt = resendCooldowns.get(key);
  if (!lastSentAt) return 0;
  const remaining = resendCooldownMs - (Date.now() - lastSentAt);
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
function getCooldownSeconds() { return Math.ceil(resendCooldownMs / 1000); }
function getTwoFactorIdentifier(purpose: TwoFactorPurpose, userId: string) { return `two-factor:${purpose}:${userId}`; }
function hashTwoFactorCode(userId: string, purpose: TwoFactorPurpose, code: string) {
  return createHash("sha256").update(`${userId}:${purpose}:${code}`).digest("hex");
}
