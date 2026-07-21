import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { __supportServiceTest, addAdminSupportReply, createSupportTicket, updateSupportTicketStatus } from "@/services/supportService";

type CreateArgs = {
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
};

afterEach(() => {
  __supportServiceTest.setPrismaClientForTesting(null);
  __supportServiceTest.setSendSupportEmailForTesting(null);
});

test("createSupportTicket creates guest SupportTicket and SupportMessage before emailing", async () => {
  const createCalls: CreateArgs[] = [];
  const sentEmails: Array<{ to: string; idempotencyKey?: string }> = [];

  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create(args) {
        createCalls.push(args);
        return { id: "ticket-guest", subject: args.data.subject };
      },
    },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async (input) => {
    sentEmails.push({ to: input.to, idempotencyKey: input.idempotencyKey });
    return { id: "email-1" };
  });

  const ticket = await createSupportTicket({
    email: "guest@example.com",
    subject: "Need help with search",
    category: "search-help",
    body: "Search results did not load for my flight query.",
    sourceContext: { page: "support_center" },
  });

  assert.deepEqual(ticket, { id: "ticket-guest", subject: "Need help with search" });
  assert.equal(createCalls.length, 1);
  assert.equal(createCalls[0].data.userId, undefined);
  assert.equal(createCalls[0].data.messages.create.author, "guest");
  assert.equal(createCalls[0].data.messages.create.body, "Search results did not load for my flight query.");
  assert.deepEqual(sentEmails, [{ to: "guest@example.com", idempotencyKey: "support-ticket-ticket-guest" }]);
});

test("createSupportTicket attaches logged-in userId", async () => {
  const createCalls: CreateArgs[] = [];

  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create(args) {
        createCalls.push(args);
        return { id: "ticket-user", subject: args.data.subject };
      },
    },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async () => ({ id: "email-1" }));

  await createSupportTicket({
    userId: "user-123",
    email: "user@example.com",
    subject: "Need account help",
    category: "account",
    body: "I need help accessing account support tools.",
  });

  assert.equal(createCalls[0].data.userId, "user-123");
  assert.equal(createCalls[0].data.messages.create.author, "user");
});

test("createSupportTicket fails instead of returning a local ticket when database creation fails", async () => {
  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create() {
        throw new Error("database unavailable");
      },
    },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async () => {
    throw new Error("email should not send");
  });

  await assert.rejects(
    createSupportTicket({
      email: "guest@example.com",
      subject: "Need help with search",
      category: "search-help",
      body: "Search results did not load for my flight query.",
    }),
    /database unavailable/,
  );
});

test("createSupportTicket returns saved ticket when confirmation email fails", async () => {
  const createCalls: CreateArgs[] = [];

  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create(args) {
        createCalls.push(args);
        return { id: "ticket-email-failed", subject: args.data.subject };
      },
    },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async () => {
    throw new Error("Resend unavailable");
  });

  const ticket = await createSupportTicket({
    email: "guest@example.com",
    subject: "Need help with redirect",
    category: "redirect",
    body: "The provider redirect failed after I selected an option.",
  });

  assert.deepEqual(ticket, { id: "ticket-email-failed", subject: "Need help with redirect" });
  assert.equal(createCalls.length, 1);
});

test("addAdminSupportReply creates admin SupportMessage and attempts notification email", async () => {
  const messageOrder: string[] = ["customer-message"];
  const sentEmails: Array<{ to: string; subject: string; idempotencyKey?: string }> = [];

  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create() { throw new Error("not used"); },
      async findUnique() {
        return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: "OPEN" };
      },
      async update() { throw new Error("not used"); },
    },
    supportMessage: {
      async create(args) {
        messageOrder.push(args.data.body);
        return { id: "message-admin", ticketId: args.data.ticketId, author: args.data.author, body: args.data.body, createdAt: new Date("2026-07-16T12:00:00Z") };
      },
    },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async (input) => {
    sentEmails.push({ to: input.to, subject: input.subject, idempotencyKey: input.idempotencyKey });
    return { id: "email-1" };
  });

  const result = await addAdminSupportReply({ ticketId: "ticket-1", body: "Thanks for contacting support." });

  assert.equal(result.message.author, "admin");
  assert.deepEqual(messageOrder, ["customer-message", "Thanks for contacting support."]);
  assert.deepEqual(sentEmails, [{ to: "user@example.com", subject: "Re: Your Kurioticket support request", idempotencyKey: "support-ticket-reply-message-admin" }]);
});

test("addAdminSupportReply returns saved message when notification email fails", async () => {
  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create() { throw new Error("not used"); },
      async findUnique() {
        return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: "OPEN" };
      },
      async update() { throw new Error("not used"); },
    },
    supportMessage: {
      async create(args) {
        return { id: "message-admin", ticketId: args.data.ticketId, author: args.data.author, body: args.data.body, createdAt: new Date("2026-07-16T12:00:00Z") };
      },
    },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async () => {
    throw new Error("email unavailable");
  });

  const result = await addAdminSupportReply({ ticketId: "ticket-1", body: "We are checking this." });

  assert.equal(result.message.id, "message-admin");
});

test("updateSupportTicketStatus updates valid status and returns previous status", async () => {
  const updates: Array<{ status: string }> = [];

  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create() { throw new Error("not used"); },
      async findUnique() {
        return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: "OPEN" };
      },
      async update(args) {
        updates.push(args.data);
        return { id: args.where.id, email: "user@example.com", subject: "Need help", status: args.data.status };
      },
    },
    supportMessage: {
      async create() { throw new Error("not used"); },
    },
  });

  const result = await updateSupportTicketStatus({ ticketId: "ticket-1", status: "WAITING_ON_USER" });

  assert.equal(result.previousStatus, "OPEN");
  assert.equal(result.ticket.status, "WAITING_ON_USER");
  assert.deepEqual(updates, [{ status: "WAITING_ON_USER" }]);
});

test("support mutations reject invalid ticket ids", async () => {
  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async create() { throw new Error("not used"); },
      async findUnique() { return null; },
      async update() { throw new Error("not used"); },
    },
    supportMessage: {
      async create() { throw new Error("not used"); },
    },
  });

  await assert.rejects(addAdminSupportReply({ ticketId: "missing", body: "Reply body" }), /Support ticket not found/);
  await assert.rejects(updateSupportTicketStatus({ ticketId: "missing", status: "CLOSED" }), /Support ticket not found/);
});
