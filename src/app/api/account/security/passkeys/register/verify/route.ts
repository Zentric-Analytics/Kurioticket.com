import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { assertAllowedOrigin, getWebAuthnConfig, parseClientData, parseRegistrationAuthData, sha256 } from "@/lib/passkeys";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body = await request.json();
    const response = body?.response;
    const clientData = parseClientData(response.clientDataJSON);
    assertAllowedOrigin(clientData.origin);
    if (clientData.type !== "webauthn.create") throw new Error("Invalid passkey registration type.");
    const prisma = getPrisma();
    const challenge = await prisma.webAuthnChallenge.findFirst({ where: { userId: session.user.id, challenge: clientData.challenge, type: "registration", consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!challenge) return NextResponse.json({ error: "Passkey setup expired. Try again." }, { status: 400 });
    const auth = parseRegistrationAuthData(response.authenticatorData);
    if (!auth.rpIdHash.equals(sha256(getWebAuthnConfig().rpID))) throw new Error("Invalid passkey RP ID.");
    if (!(auth.flags & 0x01) || !(auth.flags & 0x04)) throw new Error("User verification required.");
    await prisma.$transaction([
      prisma.webAuthnChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
      prisma.userPasskey.create({ data: { userId: session.user.id, credentialId: auth.credentialId, publicKey: auth.publicKey, counter: auth.counter, transports: Array.isArray(response.transports) ? response.transports.join(",") : null, deviceType: response.authenticatorAttachment || null, backedUp: Boolean(auth.flags & 0x10), name: String(body.name || "Passkey").slice(0, 80) } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to verify passkey registration." }, { status: 400 }); }
}
