import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { sendMobileEmailCode } from "./mobileEmailCodeDelivery";

export type EmailOwnershipContext = {
  userId: string;
  email: string;
  sessionKey: string;
};
const ttl = 15 * 60_000;
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
  return sendMobileEmailCode({
    userId: context.userId,
    identifier: ownershipIdentifier(context, "code"),
    purpose: "current",
    email: context.email,
    name,
  });
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
