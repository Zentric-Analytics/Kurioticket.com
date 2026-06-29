import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { consumePasskeyReauthToken } from "@/lib/passkey-reauth";
export async function PATCH(request: Request, context: RouteContext<"/api/account/security/passkeys/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "Enter a passkey name." }, { status: 400 });
  await getPrisma().userPasskey.updateMany({ where: { id, userId: session.user.id, revokedAt: null }, data: { name } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext<"/api/account/security/passkeys/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!(await consumePasskeyReauthToken(session.user.id, body.reauthToken))) return NextResponse.json({ error: "Verify your account before removing a passkey." }, { status: 403 });
  const { id } = await context.params;
  await getPrisma().userPasskey.updateMany({ where: { id, userId: session.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
