import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { verifySecondFactor } from "@/services/twoFactorService";
import { issueMobileSession } from "@/lib/account-session";
import { canAuthenticateMobileAccount, pendingMobileDeletion } from "@/lib/mobile-deletion-recovery";

const TTL = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
async function authenticationContext(userId: string, method: "PASSWORD" | "GOOGLE") {
  const user = await getPrisma().user.findUnique({ where: { id: userId }, select: { id: true, email: true, emailVerified: true, name: true, status: true, sessionVersion: true } });
  if (!user || !(await canAuthenticateMobileAccount(user, method === "GOOGLE" ? "google" : "credentials"))) return null;
  const request = user.status === "PENDING_DELETION" ? await pendingMobileDeletion(user.id) : null;
  if (user.status === "PENDING_DELETION" && !request) return null;
  return { user, binding: `${user.sessionVersion}:${user.status}:${request?.id ?? "ordinary"}` };
}

export async function createMobileTwoFactorChallenge(userId: string, authMethod: "PASSWORD" | "GOOGLE", verifiedIdentity?: { sessionVersion: number; status: string }) {
  const context = await authenticationContext(userId, authMethod);
  if (!context || (verifiedIdentity && (context.user.sessionVersion !== verifiedIdentity.sessionVersion || context.user.status !== verifiedIdentity.status))) throw new Error("AccountUnavailable");
  const proof = randomBytes(32).toString("base64url");
  const challenge = await getPrisma().mobileLoginChallenge.create({ data: { userId, authMethod, proofHash: digest(`${proof}:${context.binding}`), expiresAt: new Date(Date.now() + TTL) } });
  return { challengeToken: `ktc1.${challenge.id}.${proof}`, expiresAt: challenge.expiresAt.toISOString(), requiresTwoFactor: true as const };
}

export async function completeMobileTwoFactorChallenge(token: string, code: string, metadata?: { platform?: "ios" | "android"; appVersion?: string }) {
  const match = /^ktc1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return { error: "INVALID" as const };
  const challenge = await getPrisma().mobileLoginChallenge.findUnique({ where: { id: match[1] } });
  if (!challenge || challenge.consumedAt) return { error: "INVALID" as const };
  const context = await authenticationContext(challenge.userId, challenge.authMethod === "GOOGLE" ? "GOOGLE" : "PASSWORD");
  if (!context || (challenge.proofHash !== digest(`${match[2]}:${context.binding}`)
    && !(context.user.status === "ACTIVE" && challenge.proofHash === digest(match[2])))) return { error: "INVALID" as const };
  if (challenge.expiresAt <= new Date()) return { error: "EXPIRED" as const };
  if (challenge.attempts >= MAX_ATTEMPTS) return { error: "ATTEMPTS" as const };
  const valid = await verifySecondFactor({ userId: challenge.userId, code, consumeRecoveryCode: true });
  const verifiedAt = new Date();
  if (!valid) {
    await getPrisma().mobileLoginChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    return { error: challenge.attempts + 1 >= MAX_ATTEMPTS ? "ATTEMPTS" as const : "INVALID" as const };
  }
  const consumed = await getPrisma().mobileLoginChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: MAX_ATTEMPTS } }, data: { consumedAt: new Date() } });
  if (!consumed.count) return { error: "INVALID" as const };
  const user = context.user;
  return { session: await issueMobileSession(challenge.userId, challenge.authMethod, "MFA", metadata, { sessionVersion: user.sessionVersion, status: user.status, verifiedAt }), user: { id: user.id, email: user.email, name: user.name } };
}
