import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
export async function DELETE(_request: Request, context: RouteContext<"/api/account/security/passkeys/[id]">) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  await getPrisma().userPasskey.updateMany({ where: { id, userId: session.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
