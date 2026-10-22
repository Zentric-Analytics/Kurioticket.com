import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";

export type AdminAccountDeletionDetail = {
  id: string;
  userId: string;
  userEmail: string;
  userStatus: string;
  userRole: string;
  status: "PENDING" | "CANCELLED" | "READY_FOR_REVIEW" | "COMPLETED";
  requestedAt: string;
  deletionScheduledAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
  supportTicketId: string | null;
  reviewNotes: string | null;
  adminReference: string | null;
};

export type AdminAccountDeletionDetailResult =
  | { status: "ok"; data: AdminAccountDeletionDetail }
  | { status: "forbidden" | "not_found" | "unavailable" };

export async function getAdminAccountDeletionDetail(id: string): Promise<AdminAccountDeletionDetailResult> {
  const admin = await requireAdminApiSession();
  if (admin.response) return { status: "forbidden" };
  const db = getOptionalPrisma();
  if (!db) return { status: "unavailable" };

  try {
    const request = await db.accountDeletionRequest.findUnique({
      where: { id },
      select: {
        id: true, userId: true, email: true, status: true, requestedAt: true, deletionScheduledAt: true,
        cancelledAt: true, completedAt: true, supportTicketId: true, reviewNotes: true, adminNotificationId: true,
        user: { select: { email: true, status: true, role: true } },
      },
    });
    if (!request) return { status: "not_found" };
    return {
      status: "ok",
      data: {
        id: request.id,
        userId: request.userId,
        userEmail: request.email || request.user.email || "",
        userStatus: request.user.status,
        userRole: request.user.role,
        status: request.status,
        requestedAt: request.requestedAt.toISOString(),
        deletionScheduledAt: request.deletionScheduledAt.toISOString(),
        cancelledAt: request.cancelledAt?.toISOString() ?? null,
        completedAt: request.completedAt?.toISOString() ?? null,
        supportTicketId: request.supportTicketId,
        reviewNotes: request.reviewNotes,
        adminReference: request.adminNotificationId,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
