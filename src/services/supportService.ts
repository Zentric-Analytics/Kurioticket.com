import { getPrisma } from "@/lib/prisma";
import { sendTransactionalEmail, supportEmailSender, supportTicketClosedEmail, supportTicketEmail, supportTicketResolvedEmail } from "@/services/emailService";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import { createNotificationEvent } from "@/services/notificationService";
import type { SupportTicketStatusValue } from "@/lib/supportTickets";

type SupportReplyTransaction = {
  supportTicket: { updateMany(args: { where: { id: string; updatedAt: { lt: Date } }; data: { updatedAt: Date } }): Promise<{ count: number }> };
  supportMessage: { create(args: { data: { ticketId: string; author: string; body: string } }): Promise<{ id: string; ticketId: string; author: string; body: string; createdAt: Date }> };
};

type SupportPrismaClient = {
  $transaction?<T>(work: (tx: SupportReplyTransaction) => Promise<T>): Promise<T>;
  supportTicket: {
    updateMany(args: { where: { id: string; updatedAt: { lt: Date } }; data: { updatedAt: Date } }): Promise<{ count: number }>;
    create(args: {
      data: {
        userId?: string;
        email: string;
        subject: string;
        category: string;
        sourceContext: Record<string, unknown>;
        messages: {
          create: {
            author: string;
            body: string;
          };
        };
      };
    }): Promise<{ id: string; subject: string }>;
    findUnique(args: {
      where: { id: string };
      select?: { id?: boolean; userId?: boolean; email?: boolean; subject?: boolean; status?: boolean; updatedAt?: boolean };
      include?: { messages?: { orderBy: { createdAt: "asc" } } };
    }): Promise<{ id: string; userId?: string | null; email: string; subject: string; status: SupportTicketStatusValue; updatedAt?: Date; messages?: Array<{ id: string; createdAt: Date }> } | null>;
    update(args: {
      where: { id: string; status?: SupportTicketStatusValue; updatedAt?: Date };
      data: { status: SupportTicketStatusValue };
    }): Promise<{ id: string; email: string; subject: string; status: SupportTicketStatusValue; updatedAt?: Date }>;
  };
  supportMessage: {
    create(args: {
      data: {
        ticketId: string;
        author: string;
        body: string;
      };
    }): Promise<{ id: string; ticketId: string; author: string; body: string; createdAt: Date }>;
  };
};

type SendSupportEmail = typeof sendTransactionalEmail;
type TrackSupportAnalytics = typeof trackAnalyticsEvent;

let prismaClientForTesting: SupportPrismaClient | null = null;
let sendSupportEmailForTesting: SendSupportEmail | null = null;
let trackSupportAnalyticsForTesting: TrackSupportAnalytics | null = null;

export async function createSupportTicket(input: {
  userId?: string | null;
  email: string;
  subject: string;
  category: string;
  body: string;
  sourceContext?: Record<string, unknown>;
}) {
  const db = getSupportPrisma();
  const ticket = await db.supportTicket.create({
    data: {
      userId: input.userId || undefined,
      email: input.email,
      subject: input.subject,
      category: input.category,
      sourceContext: input.sourceContext || {},
      messages: {
        create: {
          author: input.userId ? "user" : "guest",
          body: input.body,
        },
      },
    },
  });

  try {
    await (trackSupportAnalyticsForTesting ?? trackAnalyticsEvent)({
      userId: input.userId,
      type: "SUPPORT_TICKET",
      name: "support_ticket_created",
      metadata: { category: input.category },
    });
  } catch (error) {
    // A persisted request must not look like a failed submission because optional telemetry failed.
    console.error("[support] Failed to record optional ticket analytics", error);
  }

  try {
    await getSendSupportEmail()({
      to: input.email,
      subject: "We've received your support request – Kurioticket",
      html: supportTicketEmail({ ticketId: ticket.id, subject: input.subject }),
      from: supportEmailSender(),
      template: "support_ticket",
      idempotencyKey: `support-ticket-${ticket.id}`,
      metadata: { supportTicketId: ticket.id, supportDeliveryType: "confirmation" },
    });
  } catch (error) {
    console.error("[support] Failed to send support ticket confirmation email", error);
  }

  return ticket;
}

export async function addAdminSupportReply(input: { ticketId: string; body: string }) {
  const db = getSupportPrisma();
  const ticket = await db.supportTicket.findUnique({
    where: { id: input.ticketId },
    select: { id: true, userId: true, email: true, subject: true, status: true },
  });
  if (!ticket) throw new SupportTicketNotFoundError();

  // Save the message and advance last activity together: a failed update must
  // not leave behind a reply that the admin is told to retry.
  if (!db.$transaction) throw new Error("Support transaction unavailable.");
  const message = await db.$transaction(async (tx) => {
    const saved = await tx.supportMessage.create({
      data: { ticketId: ticket.id, author: "admin", body: input.body },
    });
    // A concurrent newer ticket action must not be moved backward in the inbox.
    await tx.supportTicket.updateMany({
      where: { id: ticket.id, updatedAt: { lt: saved.createdAt } },
      data: { updatedAt: saved.createdAt },
    });
    return saved;
  });

  if (ticket.userId && !prismaClientForTesting) {
    await createNotificationEvent({ userId: ticket.userId, eventKey: `support-reply:${message.id}`, type: "SUPPORT_UPDATE", title: "Kurioticket Support replied", body: `There is a new reply to “${ticket.subject}”.`, actionPath: "/support", metadata: { ticketId: ticket.id, supportMessageId: message.id } }).catch((error) => console.error("[support] Failed to persist support reply notification", { ticketId: ticket.id, messageId: message.id, message: error instanceof Error ? error.message : "notification_failed" }));
  }

  // Replies remain in the ticket conversation. Only Open, Resolved and
  // Closed ticket lifecycle events generate automatic customer emails.
  return { ticket, message, emailStatus: "skipped" as const };
}

export async function updateSupportTicketStatus(input: { ticketId: string; status: SupportTicketStatusValue }) {
  const db = getSupportPrisma();
  const existing = await db.supportTicket.findUnique({
    where: { id: input.ticketId },
  });
  if (!existing) throw new SupportTicketNotFoundError();

  // Saving the same status is not a new lifecycle event.
  if (existing.status === input.status) {
    return { previousStatus: existing.status, ticket: existing };
  }

  let ticket: Awaited<ReturnType<typeof db.supportTicket.update>>;
  try {
    // The conditional update prevents concurrent status saves from sending
    // multiple or incorrect customer emails for the same transition.
    ticket = await db.supportTicket.update({
      where: {
        id: input.ticketId,
        status: existing.status,
        ...(existing.updatedAt ? { updatedAt: existing.updatedAt } : {}),
      },
      data: { status: input.status },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      throw new SupportTicketConflictError();
    }
    throw error;
  }

  // OPEN is confirmed once on creation. Waiting statuses are internal only.
  // Admin replies stay in the ticket conversation without sending email.
  if (input.status === "RESOLVED" || input.status === "CLOSED") {
    const resolved = input.status === "RESOLVED";
    try {
      await getSendSupportEmail()({
        to: ticket.email,
        from: supportEmailSender(),
        subject: resolved
          ? "Your support request has been resolved – Kurioticket"
          : "Your support request has been closed – Kurioticket",
        html: resolved
          ? supportTicketResolvedEmail({ ticketId: ticket.id })
          : supportTicketClosedEmail({ ticketId: ticket.id }),
        template: "support_ticket",
        // Every successful transition is distinct, including later re-resolutions.
        // The conditional status update above is the single-send gate.
        idempotencyKey: `support-ticket-status-${ticket.id}-${input.status.toLowerCase()}-${ticket.updatedAt?.toISOString() ?? Date.now()}`,
        metadata: {
          supportTicketId: ticket.id,
          supportDeliveryType: resolved ? "resolved" : "closed",
          previousStatus: existing.status,
          nextStatus: ticket.status,
        },
      });
    } catch (error) {
      // A saved status must not be reported as failed because email delivery failed.
      console.error("[support] Failed to send support status email", { ticketId: ticket.id, status: ticket.status, error });
    }
  }

  return { previousStatus: existing.status, ticket };
}

export class SupportTicketConflictError extends Error {
  constructor() {
    super("Ticket status changed. Refresh the page and try again.");
    this.name = "SupportTicketConflictError";
  }
}

export class SupportTicketNotFoundError extends Error {
  constructor() {
    super("Support ticket not found.");
    this.name = "SupportTicketNotFoundError";
  }
}

function getSupportPrisma(): SupportPrismaClient {
  return prismaClientForTesting ?? (getPrisma() as unknown as SupportPrismaClient);
}

function getSendSupportEmail() {
  return sendSupportEmailForTesting ?? sendTransactionalEmail;
}

export const __supportServiceTest = {
  setPrismaClientForTesting(prisma: SupportPrismaClient | null) {
    prismaClientForTesting = prisma;
  },
  setSendSupportEmailForTesting(sendEmail: SendSupportEmail | null) {
    sendSupportEmailForTesting = sendEmail;
  },
  setTrackAnalyticsForTesting(track: TrackSupportAnalytics | null) {
    trackSupportAnalyticsForTesting = track;
  },
};
