import { getPrisma } from "@/lib/prisma";
import { sendTransactionalEmail, supportTicketEmail } from "@/services/emailService";
import { trackAnalyticsEvent } from "@/services/analyticsService";

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
