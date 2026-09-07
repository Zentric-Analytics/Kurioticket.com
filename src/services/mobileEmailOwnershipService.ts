import { createHash, randomBytes, randomInt } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/env";
import { EmailVerificationCooldownError } from "./emailVerificationService";
import { sendTransactionalEmail, verificationCodeEmail } from "./emailService";

export type EmailOwnershipContext = {
  userId: string;
  email: string;
  sessionKey: string;
};
const ttl = 15 * 60_000;
const cooldown = 60_000;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function ownershipIdentifier(
  context: EmailOwnershipContext,
  kind: "code" | "proof",
) {
  return `mobile-email-ownership:${kind}:${hash(JSON.stringify([context.userId, context.email.toLowerCase().trim(), context.sessionKey]))}`;
}
export function ownershipToken(identifier: string, value: string) {
  return hash(identifier + ":" + value);
}

export async function sendCurrentEmailCode(
  context: EmailOwnershipContext,
  name: string | null,
) {
  const identifier = ownershipIdentifier(context, "code");
  const db = getPrisma();
  const existing = await db.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  const remaining = existing
    ? existing.expires.getTime() - ttl + cooldown - Date.now()
    : 0;
  if (remaining > 0)
    throw new EmailVerificationCooldownError(Math.ceil(remaining / 1000));
  const code = randomInt(100000, 1000000).toString();
  const token = ownershipToken(identifier, code);
  await db.$transaction(async (tx) => {
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({
      data: { identifier, token, expires: new Date(Date.now() + ttl) },
    });
  });
  try {
    await sendTransactionalEmail({
      to: context.email,
      subject: "Verify your current Kurioticket email address",
      html: verificationCodeEmail({
        code,
        name,
        expiresInMinutes: 15,
        verifyUrl: getBaseUrl() + "/personal-information",
      }),
      requireConfigured: true,
      idempotencyKey: identifier + ":" + token.slice(0, 16),
    });
  } catch (error) {
    await db.verificationToken.deleteMany({ where: { identifier, token } });
    throw error;
  }
  return { cooldownSeconds: 60 };
}

export async function verifyCurrentEmailCode(
  context: EmailOwnershipContext,
  code: string,
) {
  const identifier = ownershipIdentifier(context, "code");
  const token = ownershipToken(identifier, code);
  const proof = randomBytes(32).toString("hex");
  const proofId = ownershipIdentifier(context, "proof");
  return getPrisma().$transaction(async (tx) => {
    const claimed = await tx.verificationToken.deleteMany({
      where: { identifier, token, expires: { gt: new Date() } },
    });
    if (claimed.count !== 1) return null;
    await tx.verificationToken.create({
      data: {
        identifier: proofId,
        token: ownershipToken(proofId, proof),
        expires: new Date(Date.now() + ttl),
      },
    });
    return proof;
  });
}

export async function hasEmailOwnershipProof(
  context: EmailOwnershipContext,
  proof: string,
) {
  const identifier = ownershipIdentifier(context, "proof");
  return !!(await getPrisma().verificationToken.findFirst({
    where: {
      identifier,
      token: ownershipToken(identifier, proof),
      expires: { gt: new Date() },
    },
  }));
}

export async function claimEmailOwnershipProof(
  tx: Pick<ReturnType<typeof getPrisma>, "verificationToken">,
  context: EmailOwnershipContext,
  proof: string,
) {
  const identifier = ownershipIdentifier(context, "proof");
  const result = await tx.verificationToken.deleteMany({
    where: {
      identifier,
      token: ownershipToken(identifier, proof),
      expires: { gt: new Date() },
    },
  });
  return result.count === 1;
}
