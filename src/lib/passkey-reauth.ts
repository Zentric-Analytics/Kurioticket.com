import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

function hashToken(token: string) { return createHash("sha256").update(`passkey-reauth:${token}`).digest("hex"); }

export async function consumePasskeyReauthToken(userId: string, token: unknown) {
  const raw = String(token || "").trim();
  if (!raw) return false;
  const prisma = getPrisma();
  const stored = await prisma.verificationToken.findFirst({
    where: { identifier: `passkey-reauth:${userId}`, token: hashToken(raw), expires: { gt: new Date() } },
  });
  if (!stored) return false;
  await prisma.verificationToken.delete({ where: { identifier_token: { identifier: stored.identifier, token: stored.token } } });
  return true;
}
