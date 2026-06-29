import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function serializeDate(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function serializeRequest(request: Awaited<ReturnType<typeof getDeletionRequest>>) {
  if (!request) return null;
  return {
    id: request.id,
    userId: request.userId,
    userEmail: request.email || request.user.email,
    userStatus: request.user.status,
    userRole: request.user.role,
    status: request.status,
    requestedAt: serializeDate(request.requestedAt),
    deletionScheduledAt: serializeDate(request.deletionScheduledAt),
    cancelledAt: serializeDate(request.cancelledAt),
    completedAt: serializeDate(request.completedAt),
    supportTicketId: request.supportTicketId,
    reviewNotes: request.reviewNotes,
    adminReference: request.adminNotificationId,
  };
}

async function getDeletionRequest(id: string) {
  return getPrisma().accountDeletionRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, role: true, status: true } } },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const admin = await requireAdminApiSession();
  if (admin.response) return admin.response;

  const { id } = await context.params;
  const deletionRequest = await getDeletionRequest(id);
  if (!deletionRequest) return NextResponse.json({ error: "Deletion request not found." }, { status: 404 });

  return NextResponse.json({ request: serializeRequest(deletionRequest) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdminApiSession();
  if (admin.response) return admin.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { action?: string; reviewNotes?: unknown; adminReference?: unknown } | null;
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Action is required." }, { status: 400 });

  const existing = await getDeletionRequest(id);
  if (!existing) return NextResponse.json({ error: "Deletion request not found." }, { status: 404 });
  if (existing.user.role === "ADMIN") return NextResponse.json({ error: "Admin account deletion requests cannot be managed here." }, { status: 403 });

  const reviewNotes = typeof body.reviewNotes === "string" ? body.reviewNotes.slice(0, 5000) : existing.reviewNotes;
  const adminReference = typeof body.adminReference === "string" ? body.adminReference.slice(0, 255) : existing.adminNotificationId;
  const data: { reviewNotes?: string | null; adminNotificationId?: string | null; status?: "READY_FOR_REVIEW" | "COMPLETED"; completedAt?: Date } = {
    reviewNotes: reviewNotes || null,
    adminNotificationId: adminReference || null,
  };

  if (body.action === "mark_ready_for_review") {
    if (existing.status !== "PENDING") return NextResponse.json({ error: "Only pending requests can be marked ready for review." }, { status: 400 });
    if (existing.deletionScheduledAt.getTime() > Date.now()) return NextResponse.json({ error: "The 7-day deadline has not passed yet." }, { status: 400 });
    data.status = "READY_FOR_REVIEW";
  } else if (body.action === "mark_completed") {
    if (existing.status !== "READY_FOR_REVIEW") return NextResponse.json({ error: "Only ready-for-review requests can be marked completed." }, { status: 400 });
    data.status = "COMPLETED";
    data.completedAt = new Date();
  } else if (body.action !== "save_notes") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const updated = await getPrisma().accountDeletionRequest.update({
    where: { id },
    data,
    include: { user: { select: { id: true, email: true, role: true, status: true } } },
  });

  await writeAdminAuditLog({
    adminUserId: admin.session.user.id,
    adminEmail: admin.session.user.email,
    action: `account_deletion.${body.action}`,
    targetType: "AccountDeletionRequest",
    targetId: updated.id,
    targetEmail: updated.email,
    metadata: { previousStatus: existing.status, nextStatus: updated.status, hardDeleteTriggered: false },
    request,
  });

  return NextResponse.json({ request: serializeRequest(updated) });
}
