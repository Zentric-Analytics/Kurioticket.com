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

export async function validateMobileBearer(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const match = /^ktm1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  const session = await getPrisma().accountSession.findUnique({ where: { id: match[1] }, include: { user: { include: { accounts: { select: { provider: true } }, securitySettings: { select: { twoFactorEnabled: true } } } } } });
  const supplied = Buffer.from(hash(match[2]), "hex");
  const stored = Buffer.from(session?.tokenHash || "", "hex");
  if (!session || session.client !== "MOBILE" || stored.length !== supplied.length || !timingSafeEqual(stored, supplied)) return null;
  if (session.revokedAt || session.expiresAt <= new Date() || session.sessionVersion !== session.user.sessionVersion) return null;
  if (!(await canAuthenticateAccount(session.user, session.authMethod === "GOOGLE" ? "google" : "credentials"))) return null;
  if (session.user.securitySettings?.twoFactorEnabled && session.assuranceLevel === "PRIMARY") return null;
  if (Date.now() - session.lastSeenAt.getTime() >= LAST_SEEN_WRITE_MS) void getPrisma().accountSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { lastSeenAt: new Date() } });
  return session;
}

export async function validateAccountSession(id: string, userId: string) {
  const session = await getPrisma().accountSession.findFirst({ where: { id, userId }, include: { user: { include: { securitySettings: { select: { twoFactorEnabled: true } } } } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.sessionVersion !== session.user.sessionVersion) return null;
  if (!(await canAuthenticateAccount(session.user))) return null;
  if (session.user.securitySettings?.twoFactorEnabled && session.assuranceLevel === "PRIMARY") return null;
  return session;
}

export async function revokeSession(userId: string, sessionId: string, reason = "user_revoked") {
  return getPrisma().$transaction(async tx => {
    const result = await tx.accountSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: reason } });
    if (result.count) await tx.securityEvent.create({ data: { userId, accountSessionId: sessionId, type: "SESSION_REVOKED", metadata: { reason } } });
    return result.count === 1;
  });
}

export async function revokeAllSessions(userId: string, reason = "sign_out_everywhere") {
  return getPrisma().$transaction(async tx => {
    await tx.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
    await tx.accountSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: reason } });
    return tx.securityEvent.create({ data: { userId, type: "ALL_SESSIONS_REVOKED", metadata: { reason } } });
  });
}

export function hasRecentReauthentication(session: { reauthenticatedAt: Date | null; assuranceLevel: string }) {
  return session.assuranceLevel !== "PRIMARY" && Boolean(session.reauthenticatedAt && Date.now() - session.reauthenticatedAt.getTime() <= RECENT_REAUTHENTICATION_MS);
}
