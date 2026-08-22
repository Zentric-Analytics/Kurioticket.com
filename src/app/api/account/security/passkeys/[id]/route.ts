import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { getPrisma } from "@/lib/prisma";
import { consumePasskeyReauthToken } from "@/lib/passkey-reauth";
import { deliverSecurityEvent } from "@/services/securityEventService";
export async function PATCH(request: Request, context: RouteContext<"/api/account/security/passkeys/[id]">) {
  const canonical = await requireWebApiSession();
  const session = canonical?.session;
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "Enter a passkey name." }, { status: 400 });
  await getPrisma().userPasskey.updateMany({ where: { id, userId: session.user.id, revokedAt: null }, data: { name } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext<"/api/account/security/passkeys/[id]">) {
  const canonical = await requireWebApiSession();
  const session = canonical?.session;
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!(await consumePasskeyReauthToken(session.user.id, body.reauthToken, "removal"))) return NextResponse.json({ error: "Verify your account before removing a passkey." }, { status: 403 });
  const { id } = await context.params;
  const securityEvent = await getPrisma().$transaction(async tx => {
    const removed = await tx.userPasskey.updateMany({ where: { id, userId: session.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!removed.count) return null;
    return tx.securityEvent.create({ data: { userId: session.user.id, accountSessionId: canonical!.accountSession.id, type: "PASSKEY_REMOVED", metadata: { passkeyId: id } } });
  });
  if (!securityEvent) return NextResponse.json({ error: "Passkey not found." }, { status: 404 });
  await deliverSecurityEvent({ userId: session.user.id, email: session.user.email, securityEventId: securityEvent.id, title: "Passkey removed", body: "A passkey was removed from your Kurioticket account. If this wasn’t you, secure your account immediately.", metadata: { passkeyId: id } });
  return NextResponse.json({ ok: true });
}
