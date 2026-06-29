import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getWebAuthnConfig, newChallenge } from "@/lib/passkeys";
export async function POST() {
  const challenge = newChallenge();
  await getPrisma().webAuthnChallenge.create({ data: { challenge, type: "authentication", expiresAt: new Date(Date.now() + 5 * 60_000) } });
  return NextResponse.json({ options: { challenge, timeout: 60000, rpId: getWebAuthnConfig().rpID, userVerification: "required" } });
}
