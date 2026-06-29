import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getWebAuthnConfig, newChallenge, userHandle } from "@/lib/passkeys";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const prisma = getPrisma();
  const challenge = newChallenge();
  await prisma.webAuthnChallenge.create({ data: { userId: session.user.id, challenge, type: "registration", expiresAt: new Date(Date.now() + 5 * 60_000) } });
  const existing = await prisma.userPasskey.findMany({ where: { userId: session.user.id, revokedAt: null }, select: { credentialId: true, transports: true } });
  const cfg = getWebAuthnConfig();
  return NextResponse.json({ options: { challenge, rp: { name: cfg.rpName, id: cfg.rpID }, user: { id: userHandle(session.user.id), name: session.user.email, displayName: session.user.name || session.user.email }, pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000, attestation: "none", authenticatorSelection: { residentKey: "preferred", userVerification: "required" }, excludeCredentials: existing.map((p) => ({ id: p.credentialId, type: "public-key", transports: p.transports ? p.transports.split(",") : undefined })) } });
}
