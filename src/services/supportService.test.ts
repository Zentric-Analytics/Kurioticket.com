import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { __supportServiceTest, createSupportTicket } from "@/services/supportService";

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
