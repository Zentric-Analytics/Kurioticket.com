import { addDays } from "date-fns";
import { getAdminEmails } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import { lockVisitorAccount } from "@/services/visitorActivityIdentity";
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

  const mutation = await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: input.userId }, data: { status: "PENDING_DELETION", sessionVersion: { increment: 1 } } });
    await tx.accountSession.updateMany({ where: { userId: input.userId, revokedAt: null }, data: { revokedAt: requestedAt, revokeReason: "account_deletion_requested" } });
    const request = await tx.accountDeletionRequest.create({
      data: { userId: input.userId, email: input.email, requestedAt, deletionScheduledAt, supportTicketId: ticket.id, userReason: input.reason || null },
    });
    const securityEvent = await tx.securityEvent.create({ data: { userId: input.userId, type: "ACCOUNT_DELETION_REQUESTED", metadata: { deletionRequestId: request.id } } });
    return { request, securityEvent };
  });
  const { request } = mutation;

  await recordAccountEventSafely({ userId: input.userId, email: null, eventKey: `account-deletion:${request.id}:requested`, type: "ACCOUNT_UPDATE", title: "Account deletion requested", body: "Your Kurioticket account deletion request was received. You can reactivate during the grace period.", actionPath: "/security", metadata: { deletionRequestId: request.id, status: "PENDING" } });

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
  const now = new Date();

  const updated = await db.$transaction(async (tx) => {
    const account = await lockVisitorAccount(tx, userId);
    if (!account) throw new Error("NoPendingRequest");

    const request = await tx.accountDeletionRequest.findFirst({
      where: {
        userId,
        status: { in: ["PENDING", "READY_FOR_REVIEW"] },
        cancelledAt: null,
        completedAt: null,
      },
      orderBy: { requestedAt: "desc" },
    });
    if (!request) throw new Error("NoPendingRequest");

    await tx.$queryRaw`SELECT "id" FROM "AccountDeletionRequest" WHERE "id" = ${request.id} FOR UPDATE`;
    const lockedRequest = await tx.accountDeletionRequest.findUnique({ where: { id: request.id } });
    if (!lockedRequest || lockedRequest.status === "CANCELLED" || lockedRequest.completedAt) {
      throw new Error("NoPendingRequest");
    }
    if (lockedRequest.deletionScheduledAt.getTime() <= now.getTime()) {
      throw new Error("GracePeriodExpired");
    }
    if (account.status !== "PENDING_DELETION") throw new Error("AccountUnavailable");

    await tx.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
    return tx.accountDeletionRequest.update({
      where: { id: lockedRequest.id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancellationMetadata: { source: "self-service-reactivation" },
      },
    });
  });

  await recordAccountEventSafely({
    userId,
    email: null,
    eventKey: `account-deletion:${updated.id}:cancelled`,
    type: "ACCOUNT_UPDATE",
    title: "Account deletion cancelled",
    body: "Your Kurioticket account deletion request was cancelled and your account is active.",
    actionPath: "/security",
    metadata: { deletionRequestId: updated.id, status: "CANCELLED" },
  });
  await sendTransactionalEmail({
    to: email,
    subject: "Kurioticket account deletion request cancelled",
    html: accountDeletionCancelledEmail(),
    idempotencyKey: `account-deletion-cancelled-${updated.id}`,
  }).catch((error) =>
    console.error("[account-deletion:cancel-email-failed]", {
      requestId: updated.id,
      message: error instanceof Error ? error.message : "email_failed",
    }),
  );
  return updated;
}

export async function markDeletionRequestsReadyForReview(now = new Date()) {
  return getPrisma().accountDeletionRequest.updateMany({
    where: { status: "PENDING", deletionScheduledAt: { lte: now }, cancelledAt: null, completedAt: null, user: { role: { not: "ADMIN" } } },
    data: { status: "READY_FOR_REVIEW", reviewNotes: "Grace period expired. Review legal, tax, fraud, booking, payment, support, and compliance retention before anonymization." },
  });
}
