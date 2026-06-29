import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { assertAllowedOrigin, getWebAuthnConfig, newPasskeyLoginToken, parseAuthenticatorData, parseClientData, passkeyStrongAuthNote, sha256, verifyAssertionSignature } from "@/lib/passkeys";

async function pendingDeletionAllowed(userId: string) {
  return Boolean(await getPrisma().accountDeletionRequest.findFirst({ where: { userId, status: { in: ["PENDING", "READY_FOR_REVIEW"] }, cancelledAt: null, completedAt: null, deletionScheduledAt: { gt: new Date() } }, select: { id: true } }));
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = body?.response;
    const clientData = parseClientData(response.clientDataJSON);
    assertAllowedOrigin(clientData.origin);
    if (clientData.type !== "webauthn.get") throw new Error("Invalid passkey authentication type.");
    const prisma = getPrisma();
    const challenge = await prisma.webAuthnChallenge.findFirst({ where: { challenge: clientData.challenge, type: "authentication", consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!challenge) return NextResponse.json({ error: "Passkey sign-in expired. Try again." }, { status: 400 });
    const passkey = await prisma.userPasskey.findUnique({ where: { credentialId: body.id }, include: { user: true } });
    if (!passkey || passkey.revokedAt) return NextResponse.json({ error: "Passkey is not recognized." }, { status: 401 });
    if (passkey.user.status === "PENDING_DELETION" && !(await pendingDeletionAllowed(passkey.userId))) return NextResponse.json({ error: "This account is not available." }, { status: 403 });
    if (!["ACTIVE", "PENDING_DELETION"].includes(passkey.user.status)) return NextResponse.json({ error: "This account is not available." }, { status: 403 });
    const auth = parseAuthenticatorData(response.authenticatorData);
    if (!auth.rpIdHash.equals(sha256(getWebAuthnConfig().rpID))) throw new Error("Invalid RP ID.");
    if (!(auth.flags & 0x01) || !(auth.flags & 0x04)) throw new Error("User verification required.");
    if (auth.counter !== 0 && passkey.counter !== 0 && auth.counter <= passkey.counter) throw new Error("Possible passkey replay detected.");
    if (!verifyAssertionSignature({ publicKey: passkey.publicKey, authenticatorData: response.authenticatorData, clientDataJSON: response.clientDataJSON, signature: response.signature })) throw new Error("Invalid passkey signature.");
    const loginToken = newPasskeyLoginToken();
    await prisma.$transaction([
      prisma.webAuthnChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date(), userId: passkey.userId, loginToken } }),
      prisma.userPasskey.update({ where: { id: passkey.id }, data: { counter: auth.counter, lastUsedAt: new Date() } }),
    ]);
    return NextResponse.json({ ok: true, loginToken, email: passkey.user.email, redirectTo: passkey.user.status === "PENDING_DELETION" ? "/account/pending-deletion" : null, note: passkeyStrongAuthNote });
  } catch { return NextResponse.json({ error: "Unable to verify passkey sign-in." }, { status: 400 }); }
}
