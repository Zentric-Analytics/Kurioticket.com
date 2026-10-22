import { NextResponse } from "next/server";

import {
  isProtectedAdminEmail,
  requireAdminApiSession,
  writeAdminAuditLog,
} from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { lockVisitorAccount } from "@/services/visitorActivityIdentity";
import { retireAccountVisitors } from "@/services/visitorAccountRetirement";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
type PermanentDeleteBody = { confirmEmail?: string; confirmUserId?: string };

const routeName = "DELETE /api/admin/users/[id]/permanent";

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const body = await readPermanentDeleteBody(request);
  const db = getPrisma();

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!target)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (target.id === auth.session.user.id) {
    return NextResponse.json(
      { error: "Admins cannot permanently delete their own account." },
      { status: 400 },
    );
  }

  if (isProtectedAdminEmail(target.email)) {
    return NextResponse.json(
      { error: "Protected admin users cannot be permanently deleted." },
      { status: 400 },
    );
  }

  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admin users cannot be permanently deleted." },
      { status: 400 },
    );
  }

  if (target.status !== "DELETED") {
    return NextResponse.json(
      { error: "Only already soft-deleted users can be permanently deleted." },
      { status: 400 },
    );
  }

  const deletionRequest = await db.accountDeletionRequest.findFirst({
    where: { userId: target.id },
    select: { id: true, status: true },
    orderBy: { requestedAt: "desc" },
  });
  if (deletionRequest) {
    return NextResponse.json(
      {
        error: "Accounts with a deletion request must use the audited account-deletion finalization flow.",
        deletionRequestId: deletionRequest.id,
      },
      { status: 409 },
    );
  }

  const targetEmail = target.email?.trim() || null;
  const normalizedTargetEmail = targetEmail?.toLowerCase() || null;

  if (normalizedTargetEmail) {
    const confirmedEmail = body.confirmEmail?.trim().toLowerCase() || "";
    if (confirmedEmail !== normalizedTargetEmail) {
      return NextResponse.json(
        {
          error: "Type the target user's email to confirm permanent deletion.",
        },
        { status: 400 },
      );
    }
  } else if (body.confirmUserId !== target.id) {
    return NextResponse.json(
      { error: "Type the target user's id to confirm permanent deletion." },
      { status: 400 },
    );
  }

  const cleanupCounts = await db.$transaction(async (tx) => {
    // Recheck the account while holding the same lock used by visitor claims.
    // A reactivation or account change after confirmation must not be deleted.
    const lockedTarget = await lockVisitorAccount(tx, target.id);
    if (!lockedTarget || lockedTarget.status !== "DELETED" || lockedTarget.role === "ADMIN"
      || lockedTarget.email !== target.email || isProtectedAdminEmail(lockedTarget.email)) return null;

    const { visitorsRetired } = await retireAccountVisitors(tx, target.id);
    const verificationTokenCounts = normalizedTargetEmail
      ? await Promise.all(
          [
            `email-verification:${normalizedTargetEmail}`,
            `login-verification:${normalizedTargetEmail}`,
            `password-reset:${normalizedTargetEmail}`,
          ].map((identifier) =>
            tx.verificationToken.deleteMany({ where: { identifier } }),
          ),
        )
      : [];

    await tx.user.delete({ where: { id: target.id } });

    return {
      visitorsRetired,
      verificationTokensDeleted: verificationTokenCounts.reduce(
        (sum, result) => sum + result.count,
        0,
      ),
    };
  });

  if (!cleanupCounts) {
    return NextResponse.json({ error: "This account changed. Review it before retrying permanent deletion." }, { status: 409 });
  }

  await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action: "USER_HARD_DELETED",
    targetType: "User",
    targetId: target.id,
    targetEmail: target.email,
    metadata: {
      targetId: target.id,
      targetEmail: target.email,
      previousRole: target.role,
      previousStatus: target.status,
      route: routeName,
      cleanupCounts,
    },
    request,
  });

  return NextResponse.json({ message: "User was permanently deleted." });
}

async function readPermanentDeleteBody(
  request: Request,
): Promise<PermanentDeleteBody> {
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};

    const body = parsed as Record<string, unknown>;
    return {
      confirmEmail:
        typeof body.confirmEmail === "string" ? body.confirmEmail : undefined,
      confirmUserId:
        typeof body.confirmUserId === "string" ? body.confirmUserId : undefined,
    };
  } catch {
    return {};
  }
}
