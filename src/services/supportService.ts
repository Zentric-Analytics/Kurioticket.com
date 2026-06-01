import { withOptionalDb } from "@/lib/prisma";
import { sendTransactionalEmail, supportTicketEmail } from "@/services/emailService";
import { trackAnalyticsEvent } from "@/services/analyticsService";

export async function createSupportTicket(input: {
  userId?: string | null;
  email: string;
  subject: string;
  category: string;
  body: string;
  sourceContext?: Record<string, unknown>;
}) {
  const ticket = await withOptionalDb<{ id: string; subject: string }>(
    async (db) => {
      const created = await db.supportTicket.create({
        data: {
          userId: input.userId || undefined,
          email: input.email,
          subject: input.subject,
          category: input.category,
          sourceContext: (input.sourceContext || {}) as never,
          messages: {
            create: {
              author: input.userId ? "user" : "guest",
              body: input.body,
            },
          },
        },
      });
      return { id: created.id, subject: created.subject };
    },
    { id: `local-${Date.now()}`, subject: input.subject },
  );

  await trackAnalyticsEvent({
    userId: input.userId,
    type: "SUPPORT_TICKET",
    name: "support_ticket_created",
    metadata: { category: input.category },
  });

  await sendTransactionalEmail({
    to: input.email,
    subject: "Kurioticket support request received",
    html: supportTicketEmail({ ticketId: ticket.id, subject: input.subject }),
    idempotencyKey: `support-ticket-${ticket.id}`,
  });

  return ticket;
}
