import { createHash, randomInt } from "node:crypto";
import { getBaseUrl } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import { EmailDeliveryError, loginVerificationCodeEmail, sendTransactionalEmail, verificationCodeEmail } from "@/services/emailService";

const verificationCodeTtlMinutes = 10;
const accountEmailChangeCodeTtlMinutes = 15;
const resendCooldownMs = 60 * 1000;
const resendCooldowns = new Map<string, number>();

type SendCodeResult = {
  cooldownSeconds: number;
};

export class EmailVerificationError extends Error {
  constructor(message = "Unable to verify email right now.") {
    super(message);
    this.name = "EmailVerificationError";
  }
}

export class EmailVerificationCooldownError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Please wait before requesting another verification code.");
    this.name = "EmailVerificationCooldownError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function getEmailVerificationRedirect(email: string) {
  return `/auth/verify-email?email=${encodeURIComponent(email.toLowerCase().trim())}`;
}

export async function sendEmailVerificationCode(input: { email: string; name?: string | null; action?: string; enforceCooldown?: boolean }): Promise<SendCodeResult> {
  const email = input.email.toLowerCase().trim();
  const cooldownKey = getVerificationIdentifier(email);
  if (input.enforceCooldown) {
    reserveResendCooldown(cooldownKey);
  }

  const code = randomInt(100000, 1000000).toString();
  const token = hashVerificationCode(email, code);
  const expires = new Date(Date.now() + verificationCodeTtlMinutes * 60 * 1000);
  const identifier = getVerificationIdentifier(email);

  try {
    await getPrisma().verificationToken.deleteMany({ where: { identifier } });
    await getPrisma().verificationToken.create({
      data: {
        identifier,
        token,
        expires,
      },
    });

    await sendTransactionalEmail({
      to: email,
      subject: "Kurioticket verification code",
      html: verificationCodeEmail({ code, name: input.name, expiresInMinutes: verificationCodeTtlMinutes, verifyUrl: `${getBaseUrl()}${getEmailVerificationRedirect(email)}` }),
      idempotencyKey: `email-verification-${email}-${token.slice(0, 16)}`,
      requireConfigured: true,
    });

    console.info("[email-verification:sent]", {
      action: input.action || "email-verification",
      email,
    });

    return {
      cooldownSeconds: input.enforceCooldown
        ? getRemainingCooldownSeconds(cooldownKey) || getCooldownSeconds()
        : 0,
    };
  } catch (error) {
    if (input.enforceCooldown) {
      clearResendCooldown(cooldownKey);
    }

    console.error("[email-verification:failed]", {
      action: input.action || "email-verification",
      email,
      message: error instanceof Error ? error.message : String(error),
      status:
        error instanceof EmailDeliveryError
          ? error.statusCode
          : undefined,
    });

    throw new EmailVerificationError("Unable to send verification code right now.");
  }
}

export async function verifyEmailCode(input: { email: string; code: string }) {
  const email = input.email.toLowerCase().trim();
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) {
    console.warn("[auth:verification-failed]", { email, reason: "invalid-format" });
    return false;
  }

  const identifier = getVerificationIdentifier(email);
  const token = hashVerificationCode(email, code);
  const verificationToken = await getPrisma().verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });

  if (!verificationToken || verificationToken.expires <= new Date()) {
    console.warn("[auth:verification-failed]", {
      email,
      reason: verificationToken ? "expired" : "not-found",
    });

    if (verificationToken) {
      await getPrisma().verificationToken.deleteMany({ where: { identifier, token } });
    }
    return false;
  }

  const updateResult = await getPrisma().user.updateMany({
    where: { email },
    data: { emailVerified: new Date() },
  });
  await getPrisma().verificationToken.deleteMany({ where: { identifier } });

  const verified = updateResult.count > 0;
  if (verified) {
    console.info("[auth:verification-succeeded]", { email });
  } else {
    console.warn("[auth:verification-failed]", { email, reason: "user-not-found" });
  }

  return verified;
}

export async function sendAccountEmailChangeCode(input: { userId: string; newEmail: string; name?: string | null; enforceCooldown?: boolean }): Promise<SendCodeResult> {
  const newEmail = input.newEmail.toLowerCase().trim();
  const identifier = getAccountEmailChangeIdentifier(input.userId, newEmail);
  const latestPendingCode = await getPrisma().verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
    select: { expires: true },
  });

  if (latestPendingCode && latestPendingCode.expires <= new Date()) {
    clearResendCooldown(identifier);
  }

  if (input.enforceCooldown) {
    reserveResendCooldown(identifier);
  }

  const code = randomInt(100000, 1000000).toString();
  const token = hashVerificationCode(identifier, code);
  const expires = new Date(Date.now() + accountEmailChangeCodeTtlMinutes * 60 * 1000);

  try {
    await getPrisma().verificationToken.deleteMany({ where: { identifier } });
    await getPrisma().verificationToken.create({
      data: { identifier, token, expires },
    });

    await sendTransactionalEmail({
      to: newEmail,
      subject: "Confirm your new Kurioticket email address",
      html: verificationCodeEmail({
        code,
        name: input.name,
        expiresInMinutes: accountEmailChangeCodeTtlMinutes,
        verifyUrl: `${getBaseUrl()}/dashboard/account`,
      }),
      idempotencyKey: `account-email-change-${input.userId}-${newEmail}-${token.slice(0, 16)}`,
      requireConfigured: true,
    });

    console.info("[account-email-change:sent]", { userId: input.userId, newEmail });

    return {
      cooldownSeconds: input.enforceCooldown
        ? getRemainingCooldownSeconds(identifier) || getCooldownSeconds()
        : 0,
    };
  } catch (error) {
    if (input.enforceCooldown) {
      clearResendCooldown(identifier);
    }

    console.error("[account-email-change:failed]", {
      userId: input.userId,
      newEmail,
      message: error instanceof Error ? error.message : String(error),
      status: error instanceof EmailDeliveryError ? error.statusCode : undefined,
    });

    throw new EmailVerificationError("Unable to send verification code right now.");
  }
}

export type AccountEmailChangeCodeVerificationResult = "valid" | "invalid" | "expired";

export async function verifyAccountEmailChangeCode(input: { userId: string; newEmail: string; code: string }): Promise<AccountEmailChangeCodeVerificationResult> {
  const newEmail = input.newEmail.toLowerCase().trim();
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) return "invalid";

  const identifier = getAccountEmailChangeIdentifier(input.userId, newEmail);
  const token = hashVerificationCode(identifier, code);
  const verificationToken = await getPrisma().verificationToken.findUnique({
    where: { identifier_token: { identifier, token } },
  });

  if (!verificationToken) {
    return "invalid";
  }

  if (verificationToken.expires <= new Date()) {
    await getPrisma().verificationToken.deleteMany({ where: { identifier, token } });
    return "expired";
  }

  return "valid";
}

export async function consumeAccountEmailChangeCode(input: { userId: string; newEmail: string }) {
  const identifier = getAccountEmailChangeIdentifier(input.userId, input.newEmail.toLowerCase().trim());
  await getPrisma().verificationToken.deleteMany({ where: { identifier } });
}

function reserveResendCooldown(key: string) {
  const retryAfterSeconds = getRemainingCooldownSeconds(key);

  if (retryAfterSeconds > 0) {
    throw new EmailVerificationCooldownError(retryAfterSeconds);
  }

  resendCooldowns.set(key, Date.now());
}

function clearResendCooldown(key: string) {
  resendCooldowns.delete(key);
}

function getRemainingCooldownSeconds(key: string) {
  const lastSentAt = resendCooldowns.get(key);
  const now = Date.now();

  if (!lastSentAt || now - lastSentAt >= resendCooldownMs) {
    return 0;
  }

  return Math.ceil((resendCooldownMs - (now - lastSentAt)) / 1000);
}

function getCooldownSeconds() {
  return Math.ceil(resendCooldownMs / 1000);
}

function getVerificationIdentifier(email: string) {
  return `email-verification:${email}`;
}

function hashVerificationCode(email: string, code: string) {
  return createHash("sha256").update(`${email.toLowerCase().trim()}:${code}`).digest("hex");
}

export async function sendLoginVerificationCode(input: { email: string; name?: string | null }): Promise<SendCodeResult> {
  const email = input.email.toLowerCase().trim();
  const identifier = getLoginVerificationIdentifier(email);
  reserveResendCooldown(identifier);

  const code = randomInt(100000, 1000000).toString();
  const token = hashVerificationCode(email, code);
  const expires = new Date(Date.now() + verificationCodeTtlMinutes * 60 * 1000);

  try {
    await getPrisma().verificationToken.deleteMany({ where: { identifier } });
    await getPrisma().verificationToken.create({
      data: {
        identifier,
        token,
        expires,
      },
    });

    await sendTransactionalEmail({
      to: email,
      subject: "Kurioticket login verification code",
      html: loginVerificationCodeEmail({
        code,
        name: input.name,
        expiresInMinutes: verificationCodeTtlMinutes,
      }),
      idempotencyKey: `login-verification-${email}-${token.slice(0, 16)}`,
      requireConfigured: true,
    });

    console.info("[login-verification:sent]", { email });
    return { cooldownSeconds: getRemainingCooldownSeconds(identifier) || getCooldownSeconds() };
  } catch (error) {
    clearResendCooldown(identifier);

    console.error("[login-verification:failed]", {
      email,
      message: error instanceof Error ? error.message : String(error),
      status:
        error instanceof EmailDeliveryError
          ? error.statusCode
          : undefined,
    });

    throw new EmailVerificationError("Unable to send login verification code right now.");
  }
}

export async function verifyLoginCode(input: { email: string; code: string }) {
  const email = input.email.toLowerCase().trim();
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) return false;

  const identifier = getLoginVerificationIdentifier(email);
  const token = hashVerificationCode(email, code);
  const verificationToken = await getPrisma().verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });

  if (!verificationToken || verificationToken.expires <= new Date()) {
    if (verificationToken) {
      await getPrisma().verificationToken.deleteMany({ where: { identifier, token } });
    }
    return false;
  }

  await getPrisma().verificationToken.deleteMany({ where: { identifier } });
  return true;
}

function getLoginVerificationIdentifier(email: string) {
  return `login-verification:${email}`;
}

export function getAccountEmailChangeIdentifier(userId: string, newEmail: string) {
  return `email-change:${userId}:${newEmail.toLowerCase().trim()}`;
}
