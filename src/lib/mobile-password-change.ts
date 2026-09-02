import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { escapeHtml } from "@/services/emailDeliveryService";
import { sendTransactionalEmail } from "@/services/emailService";
import { deliverSecurityEvent } from "@/services/securityEventService";

export const PASSWORD_CHANGE_CODE_TTL_SECONDS = 5 * 60;
export const PASSWORD_CHANGE_RESEND_COOLDOWN_SECONDS = 30;
export const PASSWORD_CHANGE_FAILURE_WINDOW_SECONDS = 15 * 60;
export const PASSWORD_CHANGE_RECOVERY_THRESHOLD = 3;

const codeTtlMs = PASSWORD_CHANGE_CODE_TTL_SECONDS * 1000;
const resendCooldownMs = PASSWORD_CHANGE_RESEND_COOLDOWN_SECONDS * 1000;
const failureWindowMs = PASSWORD_CHANGE_FAILURE_WINDOW_SECONDS * 1000;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function challengeIdentifier(input: {
  userId: string;
  sessionId: string;
  challengeId: string;
  newPassword: string;
}) {
  return `mobile-password-change:${input.userId}:${input.sessionId}:${input.challengeId}:${digest(input.newPassword)}`;
}

function challengePrefix(userId: string, sessionId: string, challengeId: string) {
  return `mobile-password-change:${userId}:${sessionId}:${challengeId}:`;
}

function failureIdentifier(userId: string) {
  return `mobile-password-change-failure:${userId}`;
}

function hashCode(userId: string, sessionId: string, challengeId: string, code: string) {
  return digest(`mobile-password-change:${userId}:${sessionId}:${challengeId}:${code}`);
}

export function maskPasswordChangeEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!local || !domain) return "your verified email";
  const first = local.slice(0, 1);
  return `${first}${"•".repeat(Math.max(3, Math.min(6, local.length - 1)))}@${domain}`;
}

async function recoveryState(userId: string) {
  const identifier = failureIdentifier(userId);
  const now = new Date();
  await getPrisma().verificationToken.deleteMany({
    where: { identifier, expires: { lte: now } },
  });
  const failureCount = await getPrisma().verificationToken.count({
    where: { identifier, expires: { gt: now } },
  });
  return {
    failureCount,
    recoveryAvailable: failureCount >= PASSWORD_CHANGE_RECOVERY_THRESHOLD,
  };
}

async function recordCurrentPasswordFailure(userId: string) {
  const identifier = failureIdentifier(userId);
  const now = new Date();
  await getPrisma().verificationToken.deleteMany({
    where: { identifier, expires: { lte: now } },
  });
  await getPrisma().verificationToken.create({
    data: {
      identifier,
      token: digest(randomBytes(24).toString("hex")),
      expires: new Date(Date.now() + failureWindowMs),
    },
  });
  return recoveryState(userId);
}

async function clearCurrentPasswordFailures(userId: string) {
  await getPrisma().verificationToken.deleteMany({
    where: { identifier: failureIdentifier(userId) },
  });
}

function passwordChangeCodeEmail(code: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Confirm your Kurioticket password change</h1>
      <p>Enter this verification code in the Kurioticket app to confirm that it is you changing your password:</p>
      <p style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:7px;color:#0f766e;background:#eef4f7;border-radius:12px;padding:12px 16px">${escapeHtml(code)}</p>
      <p>This code expires in 5 minutes.</p>
      <p>If you did not request this password change, do not share this code. Review your account security immediately.</p>
    </div>
  `;
}

async function findActiveChallenge(userId: string, sessionId: string, challengeId: string) {
  return getPrisma().verificationToken.findFirst({
    where: {
      identifier: { startsWith: challengePrefix(userId, sessionId, challengeId) },
      expires: { gt: new Date() },
    },
    orderBy: { expires: "desc" },
  });
}

async function issueCode(input: {
  userId: string;
  sessionId: string;
  challengeId: string;
  newPassword: string;
  email: string;
  enforceCooldown: boolean;
}) {
  const identifier = challengeIdentifier(input);
  const now = Date.now();
  const active = await findActiveChallenge(input.userId, input.sessionId, input.challengeId);

  if (input.enforceCooldown) {
    if (!active || active.identifier !== identifier) return { kind: "expired" as const };
    const sentAt = active.expires.getTime() - codeTtlMs;
    const remainingMs = sentAt + resendCooldownMs - now;
    if (remainingMs > 0) {
      return {
        kind: "cooldown" as const,
        retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      };
    }
  }

  const code = randomInt(100000, 1000000).toString();
  const token = hashCode(input.userId, input.sessionId, input.challengeId, code);
  const expires = new Date(now + codeTtlMs);

  await getPrisma().verificationToken.create({
    data: { identifier, token, expires },
  });

  try {
    await sendTransactionalEmail({
      to: input.email,
      subject: "Confirm your Kurioticket password change",
      html: passwordChangeCodeEmail(code),
      idempotencyKey: `mobile-password-change-${input.userId}-${input.sessionId}-${input.challengeId}-${expires.getTime()}`,
      requireConfigured: true,
      metadata: { purpose: "mobile-password-change" },
    });
  } catch {
    await getPrisma().verificationToken.deleteMany({ where: { token } });
    return { kind: "send-failed" as const };
  }

  await getPrisma().verificationToken.deleteMany({
    where: {
      identifier: { startsWith: challengePrefix(input.userId, input.sessionId, input.challengeId) },
      token: { not: token },
    },
  });

  return {
    kind: "issued" as const,
    challengeId: input.challengeId,
    maskedEmail: maskPasswordChangeEmail(input.email),
    expiresInSeconds: PASSWORD_CHANGE_CODE_TTL_SECONDS,
    resendAfterSeconds: PASSWORD_CHANGE_RESEND_COOLDOWN_SECONDS,
  };
}

export async function mobilePasswordChangeStatus(userId: string) {
  return recoveryState(userId);
}

export async function startMobilePasswordChange(input: {
  userId: string;
  sessionId: string;
  email: string;
  currentPassword: string;
  newPassword: string;
}) {
  const user = await getPrisma().user.findUnique({
    where: { id: input.userId },
    select: {
      passwordHash: true,
      status: true,
      email: true,
      emailVerified: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return { kind: "invalid" as const };
  if (!user.passwordHash) return { kind: "oauth-only" as const };
  if (!user.email || user.email !== input.email) return { kind: "invalid" as const };

  const currentMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!currentMatches) {
    const state = await recordCurrentPasswordFailure(input.userId);
    return { kind: "invalid-current" as const, ...state };
  }

  if (await bcrypt.compare(input.newPassword, user.passwordHash)) {
    return { kind: "same-password" as const };
  }

  if (!user.emailVerified) return { kind: "email-unverified" as const };

  await clearCurrentPasswordFailures(input.userId);
  const challengeId = randomBytes(18).toString("base64url");
  return issueCode({
    userId: input.userId,
    sessionId: input.sessionId,
    challengeId,
    newPassword: input.newPassword,
    email: user.email,
    enforceCooldown: false,
  });
}

export async function resendMobilePasswordChangeCode(input: {
  userId: string;
  sessionId: string;
  email: string;
  challengeId: string;
  newPassword: string;
}) {
  const user = await getPrisma().user.findUnique({
    where: { id: input.userId },
    select: { status: true, email: true, emailVerified: true, passwordHash: true },
  });
  if (!user || user.status !== "ACTIVE" || !user.passwordHash) return { kind: "invalid" as const };
  if (!user.email || user.email !== input.email || !user.emailVerified) return { kind: "invalid" as const };

  return issueCode({
    userId: input.userId,
    sessionId: input.sessionId,
    challengeId: input.challengeId,
    newPassword: input.newPassword,
    email: user.email,
    enforceCooldown: true,
  });
}

export async function confirmMobilePasswordChange(input: {
  userId: string;
  sessionId: string;
  email: string;
  challengeId: string;
  code: string;
  newPassword: string;
}) {
  const identifier = challengeIdentifier(input);
  const token = hashCode(input.userId, input.sessionId, input.challengeId, input.code);
  const challenge = await getPrisma().verificationToken.findUnique({ where: { token } });
  if (!challenge || challenge.identifier !== identifier || challenge.expires <= new Date()) {
    if (challenge?.expires && challenge.expires <= new Date()) {
      await getPrisma().verificationToken.deleteMany({ where: { token } });
    }
    return { kind: "invalid-code" as const };
  }

  const user = await getPrisma().user.findUnique({
    where: { id: input.userId },
    select: { id: true, passwordHash: true, status: true, email: true },
  });
  if (!user || user.status !== "ACTIVE" || !user.passwordHash || user.email !== input.email) {
    return { kind: "invalid" as const };
  }
  if (await bcrypt.compare(input.newPassword, user.passwordHash)) {
    return { kind: "same-password" as const };
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  const now = new Date();
  let event;
  try {
    event = await getPrisma().$transaction(async (tx) => {
      await tx.verificationToken.delete({ where: { token } });
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.accountSession.updateMany({
        where: { userId: user.id, id: { not: input.sessionId }, revokedAt: null },
        data: { revokedAt: now, revokeReason: "password_changed_other_device" },
      });
      await tx.accountSession.updateMany({
        where: { id: input.sessionId, userId: user.id, revokedAt: null },
        data: { reauthenticatedAt: now },
      });
      await tx.verificationToken.deleteMany({
        where: { identifier: { startsWith: challengePrefix(user.id, input.sessionId, input.challengeId) } },
      });
      await tx.verificationToken.deleteMany({ where: { identifier: failureIdentifier(user.id) } });
      return tx.securityEvent.create({
        data: { userId: user.id, accountSessionId: input.sessionId, type: "PASSWORD_CHANGED" },
      });
    });
  } catch {
    return { kind: "invalid-code" as const };
  }

  await deliverSecurityEvent({
    userId: user.id,
    email: input.email,
    securityEventId: event.id,
    title: "Password changed",
    body: "Your Kurioticket password was changed. Other signed-in devices were signed out. If this wasn’t you, reset your password and contact Support immediately.",
  }).catch(() => undefined);

  return { kind: "changed" as const };
}
