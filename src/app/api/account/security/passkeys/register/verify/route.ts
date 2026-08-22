import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { getPrisma } from "@/lib/prisma";
import { assertAllowedOrigin, getWebAuthnConfig, parseClientData, parseRegistrationAuthData, sha256 } from "@/lib/passkeys";
import { deliverSecurityEvent } from "@/services/securityEventService";

export async function POST(request: Request) {
  const canonical = await requireWebApiSession();
  const session = canonical?.session;
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
    const mutation = await prisma.$transaction(async (tx) => {
      await tx.webAuthnChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      const passkey = await tx.userPasskey.create({ data: { userId: session.user.id, credentialId: auth.credentialId, publicKey: auth.publicKey, counter: auth.counter, transports: Array.isArray(response.transports) ? response.transports.join(",") : null, deviceType: response.authenticatorAttachment || null, backedUp: Boolean(auth.flags & 0x10), name: String(body.name || "Passkey").slice(0, 80) }, select: { id: true } });
      const securityEvent = await tx.securityEvent.create({ data: { userId: session.user.id, accountSessionId: canonical!.accountSession.id, type: "PASSKEY_ADDED", metadata: { passkeyId: passkey.id } } });
      return { passkey, securityEvent };
    });
    await deliverSecurityEvent({ userId: session.user.id, email: session.user.email, securityEventId: mutation.securityEvent.id, title: "Passkey added", body: "A passkey was added to your Kurioticket account. If this wasn’t you, remove it and secure your account immediately.", metadata: { passkeyId: mutation.passkey.id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to verify passkey registration." }, { status: 400 }); }
}
