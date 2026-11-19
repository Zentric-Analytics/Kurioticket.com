import { getPrisma } from "@/lib/prisma";
import { RECENT_REAUTHENTICATION_MS } from "@/lib/account-session";

export type RecoverySession = {
  id: string; userId: string; client: string; sessionVersion: number;
  createdAt: Date; expiresAt: Date; revokedAt: Date | null; revokeReason: string | null;
  authMethod: string; assuranceLevel: string; reauthenticatedAt: Date | null; twoFactorVerifiedAt: Date | null;
  user: { id: string; email: string | null; emailVerified: Date | null; status: string; sessionVersion: number;
    securitySettings: { twoFactorEnabled: boolean; twoFactorEnabledAt?: Date | null } | null };
};
export type RecoveryRequest = {
  id: string; userId: string; status: string; requestedAt: Date; deletionScheduledAt: Date;
  cancelledAt: Date | null; completedAt: Date | null;
};

export function permitsWebDeletionRecovery(session: RecoverySession, request: RecoveryRequest, userId: string, now = new Date(), requireAssurance = true) {
  const time = now.getTime();
  if (!Number.isFinite(time) || session.client !== "WEB" || session.userId !== userId || session.user.id !== userId || request.userId !== userId) return false;
  if (!session.user.email || !session.user.emailVerified || session.user.status !== "PENDING_DELETION") return false;
  if (!["PENDING", "READY_FOR_REVIEW"].includes(request.status) || request.cancelledAt || request.completedAt) return false;
  if (!(request.requestedAt.getTime() <= time && request.deletionScheduledAt.getTime() > time && session.createdAt.getTime() <= time && session.expiresAt.getTime() > time)) return false;
  const deletionTransition = session.revokeReason === "account_deletion_requested"
    && session.revokedAt?.getTime() === request.requestedAt.getTime()
    && session.sessionVersion + 1 === session.user.sessionVersion;
  // A later ordinary login is only a recovery context while the database still
  // has this pending deletion. It never satisfies the ordinary ACTIVE guards.
  const newSignIn = !session.revokedAt && !session.revokeReason
    && session.sessionVersion === session.user.sessionVersion
    && session.createdAt >= request.requestedAt
    && ["PASSWORD", "EMAIL_CODE", "GOOGLE", "PASSKEY"].includes(session.authMethod);
  if (!deletionTransition && !newSignIn) return false;
  if (!requireAssurance) return true; // JWT identity refresh / MFA challenge only
  const verifiedAt = session.assuranceLevel === "MFA" ? session.twoFactorVerifiedAt
    : session.assuranceLevel === "PHISHING_RESISTANT" && session.authMethod === "PASSKEY" ? session.reauthenticatedAt : null;
  const assuranceDeadline = session.revokedAt?.getTime() ?? time;
  const enabledAt = session.user.securitySettings?.twoFactorEnabledAt;
  const strong = Boolean(verifiedAt && verifiedAt >= session.createdAt && verifiedAt.getTime() <= assuranceDeadline
    && (session.assuranceLevel !== "MFA" || !enabledAt || verifiedAt >= enabledAt));
  if (session.user.securitySettings?.twoFactorEnabled) return strong;
  if (strong) return true;
  // A fresh, independently verified primary sign-in is the non-MFA alternative.
  return newSignIn && time - session.createdAt.getTime() <= RECENT_REAUTHENTICATION_MS;
}

export async function readWebDeletionRecoverySession(userId: string, sessionId: string, database: Pick<ReturnType<typeof getPrisma>, "accountSession" | "accountDeletionRequest"> = getPrisma(), now = new Date(), requireAssurance = true) {
  const [session, request] = await Promise.all([
    database.accountSession.findFirst({ where: { id: sessionId, userId, client: "WEB" }, select: {
      id: true, userId: true, client: true, sessionVersion: true, createdAt: true, expiresAt: true,
      revokedAt: true, revokeReason: true, authMethod: true, assuranceLevel: true, reauthenticatedAt: true, twoFactorVerifiedAt: true,
      user: { select: { id: true, email: true, emailVerified: true, status: true, sessionVersion: true,
        securitySettings: { select: { twoFactorEnabled: true, twoFactorEnabledAt: true } } } },
    } }),
    database.accountDeletionRequest.findFirst({ where: { userId, status: { in: ["PENDING", "READY_FOR_REVIEW"] }, cancelledAt: null, completedAt: null }, orderBy: { requestedAt: "desc" },
      select: { id: true, userId: true, status: true, requestedAt: true, deletionScheduledAt: true, cancelledAt: true, completedAt: true } }),
  ]);
  return session && request && permitsWebDeletionRecovery(session, request, userId, now, requireAssurance) ? session : null;
}
