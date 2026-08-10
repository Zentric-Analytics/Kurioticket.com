import { NextResponse } from "next/server";
import {
  countActiveAdminsExcluding,
  isProtectedAdminEmail,
  requireAdminApiSession,
  writeAdminAuditLog,
} from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const allowedStatuses = ["ACTIVE", "SUSPENDED", "DELETED"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };

  if (!allowedStatuses.includes(body.status as never)) {
    return NextResponse.json(
      { error: "Choose a valid account status." },
      { status: 400 },
    );
  }

  const target = await getPrisma().user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!target)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (target.id === auth.session.user.id && body.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Admins cannot suspend or delete their own account." },
      { status: 400 },
    );
  }

  if (isProtectedAdminEmail(target.email) && body.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Protected admin users cannot be suspended or deleted." },
      { status: 400 },
    );
  }

  if (target.role === "ADMIN" && body.status !== "ACTIVE") {
    const remainingAdmins = await countActiveAdminsExcluding(target.id);
    if (remainingAdmins === 0) {
      return NextResponse.json(
        { error: "Cannot remove the last active admin." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Demote admin users before status changes or deletion." },
      { status: 400 },
    );
  }

  const user = await getPrisma().$transaction(async tx => {
    const invalidating = body.status === "SUSPENDED" || body.status === "DELETED";
    const updated = await tx.user.update({ where: { id }, data: { status: body.status as never, ...(invalidating ? { sessionVersion: { increment: 1 } } : {}) } });
    if (invalidating) {
      await tx.accountSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: body.status === "DELETED" ? "account_deleted" : "account_suspended" } });
      await tx.securityEvent.create({ data: { userId: id, type: "ACCOUNT_SUSPENDED", metadata: { nextStatus: body.status } } });
    } else if (target.status !== "ACTIVE") {
      await tx.securityEvent.create({ data: { userId: id, type: "ACCOUNT_REACTIVATED" } });
    }
    return updated;
  });
  await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action:
      body.status === "ACTIVE"
        ? "USER_REACTIVATED"
        : body.status === "SUSPENDED"
          ? "USER_SUSPENDED"
          : "USER_SOFT_DELETED",
    targetType: "User",
    targetId: user.id,
    targetEmail: user.email,
    metadata: { previousStatus: target.status, nextStatus: user.status },
    request,
  });

  return NextResponse.json({
    message: `User status updated to ${user.status}.`,
    user: { id: user.id, status: user.status },
  });
}
