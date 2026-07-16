import { getPrisma } from "@/lib/prisma";
import { sendTransactionalEmail, supportTicketEmail, supportTicketReplyEmail } from "@/services/emailService";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import type { SupportTicketStatusValue } from "@/lib/supportTickets";

type SupportPrismaClient = {
  supportTicket: {
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
      select?: { id?: boolean; email?: boolean; subject?: boolean; status?: boolean };
      include?: { messages?: { orderBy: { createdAt: "asc" } } };
    }): Promise<{ id: string; email: string; subject: string; status: SupportTicketStatusValue; messages?: Array<{ id: string; createdAt: Date }> } | null>;
    update(args: {
      where: { id: string };
      data: { status: SupportTicketStatusValue };
    }): Promise<{ id: string; email: string; subject: string; status: SupportTicketStatusValue }>;
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

let prismaClientForTesting: SupportPrismaClient | null = null;
let sendSupportEmailForTesting: SendSupportEmail | null = null;

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

  await trackAnalyticsEvent({
    userId: input.userId,
    type: "SUPPORT_TICKET",
    name: "support_ticket_created",
    metadata: { category: input.category },
  });

  try {
    await getSendSupportEmail()({
      to: input.email,
      subject: "Kurioticket support request received",
      html: supportTicketEmail({ ticketId: ticket.id, subject: input.subject }),
      template: "support_ticket",
      idempotencyKey: `support-ticket-${ticket.id}`,
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
    select: { id: true, email: true, subject: true, status: true },
  });
  if (!ticket) throw new SupportTicketNotFoundError();

  const message = await db.supportMessage.create({
    data: {
      ticketId: ticket.id,
      author: "admin",
      body: input.body,
    },
  });

  try {
    await getSendSupportEmail()({
      to: ticket.email,
      subject: "Re: Your Kurioticket support request",
      html: supportTicketReplyEmail({ ticketId: ticket.id, subject: ticket.subject, body: input.body }),
      template: "support_ticket",
      idempotencyKey: `support-ticket-reply-${message.id}`,
    });
  } catch (error) {
    console.error("[support] Failed to send support ticket reply email", error);
  }

  return { ticket, message };
}

export async function updateSupportTicketStatus(input: { ticketId: string; status: SupportTicketStatusValue }) {
  const db = getSupportPrisma();
  const existing = await db.supportTicket.findUnique({
    where: { id: input.ticketId },
    select: { id: true, email: true, subject: true, status: true },
  });
  if (!existing) throw new SupportTicketNotFoundError();

  const ticket = await db.supportTicket.update({
    where: { id: input.ticketId },
    data: { status: input.status },
  });

  return { previousStatus: existing.status, ticket };
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
};
