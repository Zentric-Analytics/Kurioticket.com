import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { canAuthenticateAccount } from "@/lib/account-security-policy";

export const RECENT_REAUTHENTICATION_MS = 10 * 60_000;
export const MOBILE_SESSION_DAYS = 30;
export const WEB_SESSION_HOURS = 8;
const LAST_SEEN_WRITE_MS = 60_000;

type AuthMethod = "PASSWORD" | "EMAIL_CODE" | "GOOGLE" | "PASSKEY" | "UNKNOWN";
type Assurance = "PRIMARY" | "MFA" | "PHISHING_RESISTANT";
const hash = (secret: string) => createHash("sha256").update(secret).digest("hex");

async function findMobileBearerSession(id: string) {
  return getPrisma().accountSession.findUnique({ where: { id }, include: { user: { include: { accounts: { select: { provider: true } }, securitySettings: { select: { twoFactorEnabled: true } } } } } });
}

type MobileBearerSession = NonNullable<Awaited<ReturnType<typeof findMobileBearerSession>>>;
type MobileBearerLookup = (id: string) => Promise<MobileBearerSession | null>;

async function validateMobileBearerToken(request: Request, lookup: MobileBearerLookup) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const match = /^ktm1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;

  const session = await lookup(match[1]);
  const supplied = Buffer.from(hash(match[2]), "hex");
  const stored = Buffer.from(session?.tokenHash || "", "hex");
  if (!session || session.client !== "MOBILE" || stored.length !== supplied.length || !timingSafeEqual(stored, supplied)) return null;
  if (session.expiresAt <= new Date()) return null;
  return session;
}

export async function createAccountSession(input: { userId: string; client: "WEB" | "MOBILE"; authMethod: AuthMethod; assuranceLevel: Assurance; expiresAt?: Date; platform?: string; appVersion?: string }) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId }, select: { sessionVersion: true } });
    if (!user) throw new Error("AccountUnavailable");
    const accountSession = await tx.accountSession.create({ data: {
      userId: input.userId, client: input.client, authMethod: input.authMethod, assuranceLevel: input.assuranceLevel,
      sessionVersion: user.sessionVersion, expiresAt: input.expiresAt ?? new Date(Date.now() + (input.client === "WEB" ? WEB_SESSION_HOURS / 24 : MOBILE_SESSION_DAYS) * 86400000),
      platform: input.platform, appVersion: input.appVersion,
      reauthenticatedAt: input.assuranceLevel === "PRIMARY" ? null : new Date(),
      twoFactorVerifiedAt: input.assuranceLevel === "MFA" ? new Date() : null,
    }});
    await tx.securityEvent.create({ data: { userId: input.userId, type: input.client === "MOBILE" ? "MOBILE_SESSION_CREATED" : "SIGN_IN", accountSessionId: accountSession.id, client: input.client, authMethod: input.authMethod, assuranceLevel: input.assuranceLevel } });
    return accountSession;
  });
}

export async function issueMobileSession(userId: string, authMethod: AuthMethod, assuranceLevel: Assurance, metadata?: { platform?: string; appVersion?: string }) {
  const secret = randomBytes(32).toString("base64url");
  const session = await createAccountSession({ userId, client: "MOBILE", authMethod, assuranceLevel, ...metadata });
  await getPrisma().accountSession.update({ where: { id: session.id }, data: { tokenHash: hash(secret) } });
  return { token: `ktm1.${session.id}.${secret}`, expires: session.expiresAt.toISOString() };
}

export async function validateMobileBearer(request: Request, lookup: MobileBearerLookup = findMobileBearerSession) {
  const session = await validateMobileBearerToken(request, lookup);
  if (!session || session.revokedAt || session.sessionVersion !== session.user.sessionVersion) return null;
  if (!(await canAuthenticateAccount(session.user, session.authMethod === "GOOGLE" ? "google" : session.authMethod === "PASSKEY" ? "passkey" : "credentials"))) return null;
  if (session.user.securitySettings?.twoFactorEnabled && session.assuranceLevel === "PRIMARY") return null;
  if (Date.now() - session.lastSeenAt.getTime() >= LAST_SEEN_WRITE_MS) void getPrisma().accountSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { lastSeenAt: new Date() } });
  return session;
}

/** Accepts only the obsolete bearer created by the account-deletion transition. */
export async function validateMobileDeletionReactivationBearer(request: Request, lookup: MobileBearerLookup = findMobileBearerSession) {
  const session = await validateMobileBearerToken(request, lookup);
  if (!session?.revokedAt || session.revokeReason !== "account_deletion_requested") return null;
  if (session.user.status !== "PENDING_DELETION" || !session.user.email || !session.user.emailVerified) return null;
  if (session.userId !== session.user.id || session.user.sessionVersion !== session.sessionVersion + 1) return null;
  return { ...session, user: { ...session.user, email: session.user.email } };
}

export async function validateAccountSession(id: string, userId: string, options: { requireCompletedTwoFactor?: boolean } = {}) {
  const session = await getPrisma().accountSession.findFirst({ where: { id, userId }, include: { user: { include: { securitySettings: { select: { twoFactorEnabled: true } } } } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.sessionVersion !== session.user.sessionVersion) return null;
  if (!(await canAuthenticateAccount(session.user, session.authMethod === "GOOGLE" ? "google" : session.authMethod === "PASSKEY" ? "passkey" : "credentials"))) return null;
  if (options.requireCompletedTwoFactor !== false && session.user.securitySettings?.twoFactorEnabled && session.assuranceLevel === "PRIMARY") return null;
  return session;
}

async function lockAccountSessionRevocation(tx: { $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number> }, userId: string) {
  // pg_advisory_xact_lock returns PostgreSQL void. Execute it as a statement so
  // Prisma does not try to deserialize the void result through $queryRaw.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('account-session-revocation'), hashtext(${userId}))`;
}

export async function revokeSession(userId: string, sessionId: string, reason = "user_revoked") {
  return getPrisma().$transaction(async tx => {
    await lockAccountSessionRevocation(tx, userId);
    const result = await tx.accountSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: reason } });
    if (result.count) await tx.securityEvent.create({ data: { userId, accountSessionId: sessionId, type: "SESSION_REVOKED", metadata: { reason } } });
    return result.count === 1;
  });
}

export async function revokeAllSessions(userId: string, reason = "sign_out_everywhere") {
  return getPrisma().$transaction(async tx => {
    await lockAccountSessionRevocation(tx, userId);
    await tx.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
    await tx.accountSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: reason } });
    return tx.securityEvent.create({ data: { userId, type: "ALL_SESSIONS_REVOKED", metadata: { reason } } });
  });
}

/** Revokes a user's other sessions while preserving and revalidating the authoritative current mobile session. */
export async function revokeOtherSessions(userId: string, currentSessionId: string, reason = "sign_out_other_sessions") {
  return getPrisma().$transaction(async tx => {
    await lockAccountSessionRevocation(tx, userId);
    const current = await tx.accountSession.findFirst({
      where: { id: currentSessionId, userId, client: "MOBILE", revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!current) throw new Error("CurrentSessionUnavailable");

    const targets = await tx.accountSession.findMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      select: { id: true },
    });
    if (!targets.length) return 0;

    const revokedAt = new Date();
    const result = await tx.accountSession.updateMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      data: { revokedAt, revokeReason: reason },
    });
    if (result.count !== targets.length) throw new Error("SessionRevocationConflict");

    await tx.securityEvent.createMany({
      data: targets.map(({ id }) => ({ userId, accountSessionId: id, type: "SESSION_REVOKED", metadata: { reason, bulk: true } })),
    });
    return result.count;
  });
}

export function hasRecentReauthentication(session: { reauthenticatedAt: Date | null; assuranceLevel: string }) {
  return session.assuranceLevel !== "PRIMARY" && Boolean(session.reauthenticatedAt && Date.now() - session.reauthenticatedAt.getTime() <= RECENT_REAUTHENTICATION_MS);
}
