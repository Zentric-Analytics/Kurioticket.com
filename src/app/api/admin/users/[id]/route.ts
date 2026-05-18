import { NextResponse } from "next/server";
import { countActiveAdminsExcluding, requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const { id } = await context.params;

  const target = await getPrisma().user.findUnique({ where: { id }, select: { id: true, email: true, role: true, status: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.id === auth.session.user.id) return NextResponse.json({ error: "Admins cannot delete their own account." }, { status: 400 });
  if (target.role === "ADMIN") {
    const remainingAdmins = await countActiveAdminsExcluding(target.id);
    if (remainingAdmins === 0) {
      return NextResponse.json({ error: "Cannot remove the last active admin." }, { status: 400 });
    }
  }

  const user = await getPrisma().user.update({ where: { id }, data: { status: "DELETED" } });
  await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action: "USER_SOFT_DELETED",
    targetType: "User",
    targetId: user.id,
    targetEmail: user.email,
    metadata: { previousStatus: target.status, nextStatus: user.status, route: "DELETE /api/admin/users/[id]" },
    request,
  });

  return NextResponse.json({ message: "User was soft deleted.", user: { id: user.id, status: user.status } });
}
