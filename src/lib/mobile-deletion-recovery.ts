import { getPrisma } from "@/lib/prisma";
import { canAuthenticateAccount } from "@/lib/account-security-policy";
import { canRetainStagingSession } from "@/lib/previewTesterAccess";
import { lockVisitorAccount } from "@/services/visitorActivityIdentity";
import type { RecoveryRequest, RecoverySession } from "./web-deletion-recovery";

export const MOBILE_RECOVERY_REASON = "account_deletion_recovery:";
export const MOBILE_RECOVERY_FRESH_MS = 10 * 60_000;
type Database = ReturnType<typeof getPrisma>;
type Reader = Pick<Database, "accountSession" | "accountDeletionRequest">;
export type MobileRecoverySession = RecoverySession & { tokenHash: string | null };

export async function pendingMobileDeletion(userId: string, database: Pick<Database, "accountDeletionRequest"> = getPrisma(), now = new Date()) {
  return database.accountDeletionRequest.findFirst({ where: { userId, status: { in: ["PENDING", "READY_FOR_REVIEW"] }, cancelledAt: null, completedAt: null,
    requestedAt: { lte: now }, deletionScheduledAt: { gt: now } }, orderBy: { requestedAt: "desc" } });
}

export async function canAuthenticateMobileAccount(user: { id: string; email: string | null; emailVerified: Date | null; status: string }, method: "credentials" | "google" | "passkey" = "credentials") {
  if (user.status === "ACTIVE") return canAuthenticateAccount(user, method);
  return user.status === "PENDING_DELETION" && Boolean(user.email && user.emailVerified)
    && await canRetainStagingSession(user.email!, method) && Boolean(await pendingMobileDeletion(user.id));
}

export function permitsMobileDeletionRecovery(session: MobileRecoverySession, request: RecoveryRequest, userId: string, now = new Date()) {
  const time = now.getTime();
  if (session.client !== "MOBILE" || session.userId !== userId || session.user.id !== userId || request.userId !== userId) return false;
  if (session.user.status !== "PENDING_DELETION" || !session.user.email || !session.user.emailVerified || !session.revokedAt || session.revokedAt > now) return false;
  if (!["PENDING", "READY_FOR_REVIEW"].includes(request.status) || request.cancelledAt || request.completedAt) return false;
  if (!(session.createdAt.getTime() <= time && session.expiresAt.getTime() > time && request.requestedAt.getTime() <= time && request.deletionScheduledAt.getTime() > time)) return false;
  const restricted = session.revokeReason === MOBILE_RECOVERY_REASON + request.id && session.sessionVersion === session.user.sessionVersion
    && session.createdAt >= request.requestedAt && session.revokedAt >= session.createdAt;
  const transition = session.revokeReason === "account_deletion_requested" && session.revokedAt.getTime() === request.requestedAt.getTime()
    && session.sessionVersion + 1 === session.user.sessionVersion;
  if (!restricted && !transition) return false;
  const verifiedAt = session.assuranceLevel === "MFA" ? session.twoFactorVerifiedAt
    : session.assuranceLevel === "PHISHING_RESISTANT" && session.authMethod === "PASSKEY" ? session.reauthenticatedAt : null;
  const enabledAt = session.user.securitySettings?.twoFactorEnabledAt;
  const strong = Boolean(verifiedAt && verifiedAt >= session.createdAt && verifiedAt <= session.revokedAt && verifiedAt.getTime() <= time
    && (session.assuranceLevel !== "MFA" || !enabledAt || verifiedAt >= enabledAt));
  if (session.user.securitySettings?.twoFactorEnabled) return strong;
  if (strong) return true;
  return Boolean(restricted && ["PASSWORD", "GOOGLE", "EMAIL_CODE"].includes(session.authMethod) && session.reauthenticatedAt
    && session.reauthenticatedAt >= session.createdAt && session.reauthenticatedAt <= session.revokedAt
    && time - session.reauthenticatedAt.getTime() >= 0 && time - session.reauthenticatedAt.getTime() <= MOBILE_RECOVERY_FRESH_MS);
}

export async function readMobileDeletionRecovery(sessionId: string, userId: string, database: Reader = getPrisma(), now = new Date()) {
  const [session, request] = await Promise.all([
    database.accountSession.findFirst({ where: { id: sessionId, userId, client: "MOBILE" }, select: {
      id: true, userId: true, client: true, tokenHash: true, sessionVersion: true, createdAt: true, expiresAt: true, revokedAt: true,
      revokeReason: true, authMethod: true, assuranceLevel: true, reauthenticatedAt: true, twoFactorVerifiedAt: true,
      user: { select: { id: true, email: true, emailVerified: true, status: true, sessionVersion: true, securitySettings: { select: { twoFactorEnabled: true, twoFactorEnabledAt: true } } } },
    } }), pendingMobileDeletion(userId, database, now),
  ]);
  return session && request && permitsMobileDeletionRecovery(session, request, userId, now) ? { session, request } : null;
}

/** Called only AFTER an independent credential/MFA/passkey verifier succeeds. */
export async function createRestrictedMobileRecoverySession(userId: string, authMethod: "PASSWORD" | "EMAIL_CODE" | "GOOGLE" | "PASSKEY" | "UNKNOWN", assuranceLevel: "PRIMARY" | "MFA" | "PHISHING_RESISTANT", tokenHash: string, metadata: { platform?: string; appVersion?: string } | undefined, expectedVersion: number, verifiedAt: Date) {
  return getPrisma().$transaction(async tx => {
    await lockVisitorAccount(tx, userId);
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, email: true, emailVerified: true, status: true, sessionVersion: true, securitySettings: { select: { twoFactorEnabled: true, twoFactorEnabledAt: true } } } });
    const request = await pendingMobileDeletion(userId, tx);
    if (!user || user.status !== "PENDING_DELETION" || user.sessionVersion !== expectedVersion || !user.email || !user.emailVerified || !request || authMethod === "UNKNOWN") throw new Error("AccountUnavailable");
    await tx.$queryRaw`SELECT "id" FROM "AccountDeletionRequest" WHERE "id" = ${request.id} FOR UPDATE`;
    const current = await tx.accountDeletionRequest.findUnique({ where: { id: request.id } });
    const now = new Date();
    if (!(verifiedAt instanceof Date) || !(verifiedAt <= now) || now.getTime() - verifiedAt.getTime() > MOBILE_RECOVERY_FRESH_MS) throw new Error("RecoveryAuthenticationRequired");
    if (!current || current.userId !== userId || verifiedAt < current.requestedAt || current.cancelledAt || current.completedAt || !["PENDING", "READY_FOR_REVIEW"].includes(current.status) || current.deletionScheduledAt <= now) throw new Error("AccountUnavailable");
    if (user.securitySettings?.twoFactorEnabled && assuranceLevel !== "MFA" && !(authMethod === "PASSKEY" && assuranceLevel === "PHISHING_RESISTANT")) throw new Error("TwoFactorRequired");
    if (assuranceLevel === "MFA" && user.securitySettings?.twoFactorEnabledAt && verifiedAt < user.securitySettings.twoFactorEnabledAt) throw new Error("TwoFactorRequired");
    const expiresAt = new Date(Math.min(verifiedAt.getTime() + MOBILE_RECOVERY_FRESH_MS, current.deletionScheduledAt.getTime()));
    const session = await tx.accountSession.create({ data: { userId, client: "MOBILE", authMethod, assuranceLevel, sessionVersion: user.sessionVersion,
      tokenHash, createdAt: verifiedAt, expiresAt, revokedAt: now, revokeReason: MOBILE_RECOVERY_REASON + current.id,
      reauthenticatedAt: verifiedAt, twoFactorVerifiedAt: assuranceLevel === "MFA" ? verifiedAt : null,
      platform: metadata?.platform, appVersion: metadata?.appVersion } });
    await tx.securityEvent.create({ data: { userId, type: "MOBILE_SESSION_CREATED", accountSessionId: session.id, client: "MOBILE", authMethod, assuranceLevel, metadata: { purpose: "account-deletion-recovery" } } });
    return { session, deadline: current.deletionScheduledAt };
  });
}
