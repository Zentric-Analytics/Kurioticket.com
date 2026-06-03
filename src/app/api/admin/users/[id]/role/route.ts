import { NextResponse } from "next/server";

import {
  countActiveAdminsExcluding,
  isProtectedAdminEmail,
  requireAdminApiSession,
  writeAdminAuditLog,
} from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const allowedRoles = ["USER", "SUPPORT"] as const;

type RouteContext = { params: Promise<{ id: string }> };
type AllowedRole = (typeof allowedRoles)[number];

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { role?: string };

  if (!allowedRoles.includes(body.role as AllowedRole)) {
    return NextResponse.json(
      { error: "Choose a valid user role." },
      { status: 400 },
    );
  }

  const target = await getPrisma().user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!target)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (target.id === auth.session.user.id) {
    return NextResponse.json(
      { error: "Admins cannot change their own role." },
      { status: 400 },
    );
  }

  if (isProtectedAdminEmail(target.email)) {
    return NextResponse.json(
      { error: "Protected admin users cannot have their role changed." },
      { status: 400 },
    );
  }

  if (target.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only admin users can be demoted from ADMIN." },
      { status: 400 },
    );
  }

  if (target.status === "ACTIVE") {
    const remainingAdmins = await countActiveAdminsExcluding(target.id);
    if (remainingAdmins === 0) {
      return NextResponse.json(
        { error: "Cannot remove the last active admin." },
        { status: 400 },
      );
    }
  }

  const nextRole = body.role as AllowedRole;
  const user = await getPrisma().user.update({
    where: { id },
    data: { role: nextRole },
  });

  await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action: "USER_ROLE_UPDATED",
    targetType: "User",
    targetId: user.id,
    targetEmail: user.email,
    metadata: { previousRole: target.role, nextRole: user.role },
    request,
  });

  return NextResponse.json({
    message: `User role updated to ${user.role}.`,
    user: { id: user.id, role: user.role },
  });
}
