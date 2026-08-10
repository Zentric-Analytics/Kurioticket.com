import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { verifySecondFactor } from "@/services/twoFactorService";
import { issueMobileSession } from "@/lib/account-session";

const TTL = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function createMobileTwoFactorChallenge(userId: string, authMethod: "PASSWORD" | "GOOGLE") {
  const proof = randomBytes(32).toString("base64url");
  const challenge = await getPrisma().mobileLoginChallenge.create({ data: { userId, authMethod, proofHash: digest(proof), expiresAt: new Date(Date.now() + TTL) } });
  return { challengeToken: `ktc1.${challenge.id}.${proof}`, expiresAt: challenge.expiresAt.toISOString(), requiresTwoFactor: true as const };
}

export async function completeMobileTwoFactorChallenge(token: string, code: string) {
  const match = /^ktc1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return { error: "INVALID" as const };
  const challenge = await getPrisma().mobileLoginChallenge.findUnique({ where: { id: match[1] } });
  if (!challenge || challenge.proofHash !== digest(match[2]) || challenge.consumedAt) return { error: "INVALID" as const };
  if (challenge.expiresAt <= new Date()) return { error: "EXPIRED" as const };
  if (challenge.attempts >= MAX_ATTEMPTS) return { error: "ATTEMPTS" as const };
  const valid = await verifySecondFactor({ userId: challenge.userId, code, consumeRecoveryCode: true });
  if (!valid) {
    await getPrisma().mobileLoginChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    return { error: challenge.attempts + 1 >= MAX_ATTEMPTS ? "ATTEMPTS" as const : "INVALID" as const };
  }
  const consumed = await getPrisma().mobileLoginChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (!consumed.count) return { error: "INVALID" as const };
  const user = await getPrisma().user.findUniqueOrThrow({ where: { id: challenge.userId }, select: { id: true, email: true, name: true } });
  return { session: await issueMobileSession(challenge.userId, challenge.authMethod, "MFA"), user };
}
