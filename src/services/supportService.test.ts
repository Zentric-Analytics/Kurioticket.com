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
  __supportServiceTest.setTrackAnalyticsForTesting(null);
});

test("createSupportTicket creates guest SupportTicket and SupportMessage before emailing", async () => {
  const createCalls: CreateArgs[] = [];
  const sentEmails: Array<{ to: string; idempotencyKey?: string }> = [];

  __supportServiceTest.setPrismaClientForTesting({
    async $transaction(work) { return work(this); },
    supportMessage: { async create() { return assert.fail("Unexpected separate message write during ticket creation"); } },
    supportTicket: {
      async updateMany() { return { count: 1 }; },
      async findUnique() { return assert.fail("Unexpected ticket lookup during creation"); },
      async update() { return assert.fail("Unexpected ticket update during creation"); },
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
    async $transaction(work) { return work(this); },
    supportMessage: { async create() { return assert.fail("Unexpected separate message write during ticket creation"); } },
    supportTicket: {
      async updateMany() { return { count: 1 }; },
      async findUnique() { return assert.fail("Unexpected ticket lookup during creation"); },
      async update() { return assert.fail("Unexpected ticket update during creation"); },
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
    async $transaction(work) { return work(this); },
    supportMessage: { async create() { return assert.fail("Unexpected separate message write during ticket creation"); } },
    supportTicket: {
      async updateMany() { return { count: 1 }; },
      async findUnique() { return assert.fail("Unexpected ticket lookup during creation"); },
      async update() { return assert.fail("Unexpected ticket update during creation"); },
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
    async $transaction(work) { return work(this); },
    supportMessage: { async create() { return assert.fail("Unexpected separate message write during ticket creation"); } },
    supportTicket: {
      async updateMany() { return { count: 1 }; },
      async findUnique() { return assert.fail("Unexpected ticket lookup during creation"); },
      async update() { return assert.fail("Unexpected ticket update during creation"); },
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

test("addAdminSupportReply saves admin SupportMessage without customer email", async () => {
  const messageOrder: string[] = ["customer-message"];
  const sentEmails: Array<{ to: string; subject: string; idempotencyKey?: string }> = [];

  __supportServiceTest.setPrismaClientForTesting({
    async $transaction(work) { return work(this); },
    supportTicket: {
      async updateMany() { return { count: 1 }; },
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
  assert.equal(result.emailStatus, "skipped");
  assert.deepEqual(messageOrder, ["customer-message", "Thanks for contacting support."]);
  assert.deepEqual(sentEmails, []);
});

test("addAdminSupportReply never calls email sender even when it would fail", async () => {
  __supportServiceTest.setPrismaClientForTesting({
    async $transaction(work) { return work(this); },
    supportTicket: {
      async updateMany() { return { count: 1 }; },
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
  assert.equal(result.emailStatus, "skipped");
});

test("updateSupportTicketStatus updates valid status and returns previous status", async () => {
  const updates: Array<{ status: string }> = [];

  __supportServiceTest.setPrismaClientForTesting({
    async $transaction(work) { return work(this); },
    supportTicket: {
      async updateMany() { return { count: 1 }; },
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
    async $transaction(work) { return work(this); },
    supportTicket: {
      async updateMany() { return { count: 1 }; },
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

test("createSupportTicket returns persisted ticket even if optional analytics fails", async () => {
  __supportServiceTest.setTrackAnalyticsForTesting(async () => { throw new Error("analytics unavailable"); });
  __supportServiceTest.setPrismaClientForTesting({
    async $transaction(work) { return work(this); },
    supportTicket: {
      async updateMany() { return { count: 1 }; },
      async create(args) { return { id: "ticket-analytics", subject: args.data.subject }; },
      async findUnique() { return null; },
      async update() { throw new Error("not used"); },
    },
    supportMessage: { async create() { throw new Error("not used"); } },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async () => ({ id: "email-accepted" }));
  const ticket = await createSupportTicket({ email: "guest@example.com", subject: "Need help", category: "search-help", body: "Flight results unavailable." });
  assert.equal(ticket.id, "ticket-analytics");
});

test("addAdminSupportReply rolls back reply when activity update fails", async () => {
  type SavedMessage = { id: string; ticketId: string; author: string; body: string; createdAt: Date };
  const committedMessages: SavedMessage[] = [];
  let attemptedWrites = 0;
  let emailAttempts = 0;
  const createdAt = new Date("2026-10-29T08:00:00Z");

  __supportServiceTest.setPrismaClientForTesting({
    async $transaction(work) {
      // Model a transaction with isolated pending writes: only publish the staged
      // messages if the whole callback completes successfully.
      const stagedMessages = [...committedMessages];
      const result = await work({
        supportMessage: {
          async create(args) {
            attemptedWrites += 1;
            const message = { id: "message-admin", ...args.data, createdAt };
            stagedMessages.push(message);
            return message;
          },
        },
        supportTicket: {
          async updateMany(args) {
            assert.deepEqual(args.where, { id: "ticket-1", updatedAt: { lt: createdAt } });
            assert.deepEqual(args.data, { updatedAt: createdAt });
            throw new Error("activity update failed");
          },
        },
      });
      committedMessages.splice(0, committedMessages.length, ...stagedMessages);
      return result;
    },
    supportTicket: {
      async updateMany() { throw new Error("activity update must be transactional"); },
      async create() { throw new Error("not used"); },
      async findUnique() { return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: "OPEN" }; },
      async update() { throw new Error("not used"); },
    },
    supportMessage: {
      // A non-transactional insert would persist immediately and fail our
      // rollback assertion, catching a regression to the old write path.
      async create(args) {
        const message = { id: "message-admin", ...args.data, createdAt };
        committedMessages.push(message);
        return message;
      },
    },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async () => {
    emailAttempts += 1;
    return { id: "email-1" };
  });

  await assert.rejects(
    addAdminSupportReply({ ticketId: "ticket-1", body: "Reply" }),
    /activity update failed/,
  );
  assert.equal(attemptedWrites, 1, "message insert should be attempted inside the transaction");
  assert.deepEqual(committedMessages, [], "no reply may survive a failed activity update");
  assert.equal(emailAttempts, 0, "do not send email for a rolled-back reply");
});

test("status notifications are sent only for transitions to Resolved and Closed", async () => {
  let currentStatus = "OPEN" as "OPEN" | "WAITING_ON_TEAM" | "WAITING_ON_USER" | "RESOLVED" | "CLOSED";
  let updatedAt = new Date("2026-11-23T12:00:00.000Z");
  const sends: Array<{ subject: string; idempotencyKey?: string; html: string; metadata?: Record<string, unknown> }> = [];
  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async updateMany() { return { count: 1 }; },
      async create() { throw new Error("not used"); },
      async findUnique() { return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: currentStatus, updatedAt }; },
      async update(args) {
        assert.equal(args.where.status, currentStatus);
        assert.deepEqual(args.where.updatedAt, updatedAt);
        currentStatus = args.data.status;
        updatedAt = new Date(updatedAt.getTime() + 1000);
        return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: currentStatus, updatedAt };
      },
    },
    supportMessage: { async create() { throw new Error("not used"); } },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async (input) => {
    sends.push({ subject: input.subject, html: input.html, metadata: input.metadata, idempotencyKey: input.idempotencyKey });
    return { id: "email-1" };
  });

  await updateSupportTicketStatus({ ticketId: "ticket-1", status: "WAITING_ON_TEAM" });
  await updateSupportTicketStatus({ ticketId: "ticket-1", status: "WAITING_ON_USER" });
  assert.equal(sends.length, 0, "waiting statuses must never trigger email");
  await updateSupportTicketStatus({ ticketId: "ticket-1", status: "RESOLVED" });
  await updateSupportTicketStatus({ ticketId: "ticket-1", status: "RESOLVED" });
  assert.equal(sends.length, 1, "re-saving Resolved must not send twice");
  await updateSupportTicketStatus({ ticketId: "ticket-1", status: "CLOSED" });
  await updateSupportTicketStatus({ ticketId: "ticket-1", status: "CLOSED" });
  assert.equal(sends.length, 2, "Resolved to Closed still sends its own email");
  await updateSupportTicketStatus({ ticketId: "ticket-1", status: "OPEN" });
  assert.equal(sends.length, 2, "reopening does not repeat initial confirmation");
  await updateSupportTicketStatus({ ticketId: "ticket-1", status: "RESOLVED" });
  assert.equal(sends.length, 3, "a later distinct resolution is a new transition");
  assert.notEqual(sends[0].idempotencyKey, sends[2].idempotencyKey);
  assert.match(sends[0].html, /Your request has been resolved/);
  assert.match(sends[1].html, /Your support request has been closed/);
  assert.ok(sends.every((email) => email.html.includes("ticket-1")));
  assert.deepEqual(sends.map((email) => email.metadata?.supportDeliveryType), ["resolved", "closed", "resolved"]);
});

test("status notification email failure does not undo saved ticket status", async () => {
  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async updateMany() { return { count: 1 }; },
      async create() { throw new Error("not used"); },
      async findUnique() { return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: "OPEN", updatedAt: new Date("2026-11-23T12:00:00Z") }; },
      async update(args) { return { id: args.where.id, email: "user@example.com", subject: "Need help", status: args.data.status }; },
    },
    supportMessage: { async create() { throw new Error("not used"); } },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async () => { throw new Error("email unavailable"); });
  const result = await updateSupportTicketStatus({ ticketId: "ticket-1", status: "CLOSED" });
  assert.equal(result.ticket.status, "CLOSED");
});

test("concurrent stale status write does not send an email", async () => {
  let sendCount = 0;
  __supportServiceTest.setPrismaClientForTesting({
    supportTicket: {
      async updateMany() { return { count: 1 }; },
      async create() { throw new Error("not used"); },
      async findUnique() { return { id: "ticket-1", email: "user@example.com", subject: "Need help", status: "OPEN", updatedAt: new Date("2026-11-23T12:00:00Z") }; },
      async update() { throw Object.assign(new Error("No record found"), { code: "P2025" }); },
    },
    supportMessage: { async create() { throw new Error("not used"); } },
  });
  __supportServiceTest.setSendSupportEmailForTesting(async () => { sendCount++; return { id: "email-1" }; });
  await assert.rejects(updateSupportTicketStatus({ ticketId: "ticket-1", status: "CLOSED" }), /Ticket status changed/);
  assert.equal(sendCount, 0);
});
