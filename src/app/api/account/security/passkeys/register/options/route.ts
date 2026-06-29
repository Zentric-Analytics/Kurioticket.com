import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getWebAuthnConfig, newChallenge, userHandle } from "@/lib/passkeys";
import { consumePasskeyReauthToken } from "@/lib/passkey-reauth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const prisma = getPrisma();
  const onboarding = body.context === "onboarding";
  if (onboarding) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true, passkeys: { where: { revokedAt: null }, select: { id: true }, take: 1 } } });
    if (!user?.emailVerified || user.passkeys.length) return NextResponse.json({ error: "Passkey setup is available after your email is verified." }, { status: 403 });
  } else if (!(await consumePasskeyReauthToken(session.user.id, body.reauthToken))) {
    return NextResponse.json({ error: "Verify your account before setting up a passkey." }, { status: 403 });
  }
  const challenge = newChallenge();
  await prisma.webAuthnChallenge.create({ data: { userId: session.user.id, challenge, type: "registration", expiresAt: new Date(Date.now() + 5 * 60_000) } });
  const existing = await prisma.userPasskey.findMany({ where: { userId: session.user.id, revokedAt: null }, select: { credentialId: true, transports: true } });
  const cfg = getWebAuthnConfig();
  return NextResponse.json({ options: { challenge, rp: { name: cfg.rpName, id: cfg.rpID }, user: { id: userHandle(session.user.id), name: session.user.email, displayName: session.user.name || session.user.email }, pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000, attestation: "none", authenticatorSelection: { residentKey: "preferred", userVerification: "required" }, excludeCredentials: existing.map((p) => ({ id: p.credentialId, type: "public-key", transports: p.transports ? p.transports.split(",") : undefined })) } });
}
