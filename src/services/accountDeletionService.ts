import { addDays } from "date-fns";
import { getAdminEmails } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import { sendTransactionalEmail, accountDeletionCancelledEmail, accountDeletionRequestAdminEmail, accountDeletionRequestEmail } from "@/services/emailService";
import { createSupportTicket } from "@/services/supportService";
import { recordAccountEventSafely } from "@/services/accountNotificationService";

const GRACE_DAYS = 7;

export async function getCurrentDeletionRequest(userId: string) {
  return getPrisma().accountDeletionRequest.findFirst({
    where: { userId, status: { in: ["PENDING", "READY_FOR_REVIEW"] }, cancelledAt: null, completedAt: null },
    orderBy: { requestedAt: "desc" },
  });
}

export async function requestAccountDeletion(input: { userId: string; email: string; reason?: string | null }) {
  const db = getPrisma();
  const existing = await getCurrentDeletionRequest(input.userId);
  if (existing) return { request: existing, created: false };

  const user = await db.user.findUnique({ where: { id: input.userId }, select: { role: true, status: true, name: true } });
  if (!user || user.status === "DELETED") throw new Error("AccountUnavailable");
  if (user.role === "ADMIN") throw new Error("AdminDeletionBlocked");

  const requestedAt = new Date();
  const deletionScheduledAt = addDays(requestedAt, GRACE_DAYS);
  const ticket = await createSupportTicket({
    userId: input.userId,
    email: input.email,
    subject: "Account deletion request",
    category: "account_deletion",
    body: `Account deletion requested. Deadline: ${deletionScheduledAt.toISOString()}. Do not hard-delete before retention review.`,
    sourceContext: { source: "dashboard-security", action: "account-deletion-request", deletionScheduledAt: deletionScheduledAt.toISOString() },
  });

  const request = await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: input.userId }, data: { status: "PENDING_DELETION" } });
    return tx.accountDeletionRequest.create({
      data: { userId: input.userId, email: input.email, requestedAt, deletionScheduledAt, supportTicketId: ticket.id, userReason: input.reason || null },
    });
  });

  await recordAccountEventSafely({ userId: input.userId, email: null, eventKey: `account-deletion:${request.id}:requested`, type: "ACCOUNT_UPDATE", title: "Account deletion requested", body: "Your Kurioticket account deletion request was received. You can reactivate during the grace period.", actionPath: "/settings", metadata: { deletionRequestId: request.id, status: "PENDING" } });

  await sendTransactionalEmail({
    to: input.email,
    subject: "Kurioticket account deletion request received",
    html: accountDeletionRequestEmail({ deadline: deletionScheduledAt }),
    idempotencyKey: `account-deletion-user-${request.id}`,
  }).catch((error) => console.error("[account-deletion:user-email-failed]", { requestId: request.id, message: error instanceof Error ? error.message : "email_failed" }));
  await Promise.allSettled(getAdminEmails().map((adminEmail) => sendTransactionalEmail({
    to: adminEmail,
    subject: `Account deletion request: ${input.email}`,
    html: accountDeletionRequestAdminEmail({ userId: input.userId, email: input.email, requestedAt, deadline: deletionScheduledAt, supportTicketId: ticket.id }),
    idempotencyKey: `account-deletion-admin-${request.id}-${adminEmail}`,
  })));
  return { request, created: true };
}

export async function reactivateAccount(userId: string, email: string) {
  const db = getPrisma();
  const request = await getCurrentDeletionRequest(userId);
  if (!request) throw new Error("NoPendingRequest");
  if (request.deletionScheduledAt <= new Date()) throw new Error("GracePeriodExpired");

  const updated = await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
    return tx.accountDeletionRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationMetadata: { source: "self-service-reactivation" } },
    });
  });
  await recordAccountEventSafely({ userId, email: null, eventKey: `account-deletion:${request.id}:cancelled`, type: "ACCOUNT_UPDATE", title: "Account deletion cancelled", body: "Your Kurioticket account deletion request was cancelled and your account is active.", actionPath: "/settings", metadata: { deletionRequestId: request.id, status: "CANCELLED" } });
  await sendTransactionalEmail({
    to: email,
    subject: "Kurioticket account deletion request cancelled",
    html: accountDeletionCancelledEmail(),
    idempotencyKey: `account-deletion-cancelled-${request.id}`,
  }).catch((error) => console.error("[account-deletion:cancel-email-failed]", { requestId: request.id, message: error instanceof Error ? error.message : "email_failed" }));
  return updated;
}

export async function markDeletionRequestsReadyForReview(now = new Date()) {
  return getPrisma().accountDeletionRequest.updateMany({
    where: { status: "PENDING", deletionScheduledAt: { lte: now }, cancelledAt: null, completedAt: null, user: { role: { not: "ADMIN" } } },
    data: { status: "READY_FOR_REVIEW", reviewNotes: "Grace period expired. Review legal, tax, fraud, booking, payment, support, and compliance retention before anonymization." },
  });
}
