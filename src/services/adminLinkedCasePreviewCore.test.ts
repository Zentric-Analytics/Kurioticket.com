import assert from "node:assert/strict";
import test from "node:test";

import { createAdminLinkedCasePreviewReader } from "./adminLinkedCasePreviewCore";

const userId = "user_000001";
const ticketId = "ticket_000001";
const deletionId = "deletion_000001";

function supportSource(overrides: Record<string, unknown> = {}) {
  return { id: ticketId, userId, category: "account_deletion", ...overrides };
}
function deletionSource(overrides: Record<string, unknown> = {}) {
  return { id: deletionId, userId, supportTicketId: ticketId, status: "CANCELLED", ...overrides };
}
function deletionPreview() {
  return {
    id: deletionId,
    status: "CANCELLED",
    requestedAt: new Date("2026-11-10T00:00:00.000Z"),
    deletionScheduledAt: new Date("2026-11-17T00:00:00.000Z"),
    cancelledAt: new Date("2026-11-14T00:00:00.000Z"),
    completedAt: null as Date | null,
  };
}
function supportPreview() {
  return {
    id: ticketId,
    subject: "Account deletion request",
    category: "account_deletion",
    status: "RESOLVED",
    priority: "NORMAL",
    createdAt: new Date("2026-11-10T00:00:00.000Z"),
    updatedAt: new Date("2026-11-14T00:00:00.000Z"),
    _count: { messages: 3 },
  };
}

function fixture(input: {
  authorized?: boolean;
  databaseAvailable?: boolean;
  throwError?: boolean;
  ticket?: ReturnType<typeof supportSource> | null;
  deletion?: ReturnType<typeof deletionSource> | null;
  supportMatch?: ReturnType<typeof supportPreview> | null;
  deletionMatch?: ReturnType<typeof deletionPreview> | null;
  deletionMatches?: Array<ReturnType<typeof deletionPreview>>;
} = {}) {
  const calls: Array<{ model: string; method: string; args: unknown }> = [];
  let databaseCalls = 0;
  const record = (model: string, method: string, args: unknown, value: unknown) => {
    calls.push({ model, method, args });
    if (input.throwError) throw new Error("simulated database failure");
    return value;
  };
  const read = createAdminLinkedCasePreviewReader({
    authorize: async () => input.authorized !== false,
    database: () => {
      databaseCalls++;
      if (input.databaseAvailable === false) return null;
      return {
        supportTicket: {
          findUnique: async (args: unknown) => record("supportTicket", "findUnique", args, input.ticket === undefined ? supportSource() : input.ticket),
          findFirst: async (args: unknown) => record("supportTicket", "findFirst", args, input.supportMatch === undefined ? supportPreview() : input.supportMatch),
        },
        accountDeletionRequest: {
          findUnique: async (args: unknown) => record("accountDeletionRequest", "findUnique", args, input.deletion === undefined ? deletionSource() : input.deletion),
          findMany: async (args: unknown) => record("accountDeletionRequest", "findMany", args,
            input.deletionMatches ?? (input.deletionMatch === undefined
              ? [deletionPreview()]
              : input.deletionMatch ? [input.deletionMatch] : [])),
        },
      } as never;
    },
  });
  return { read, calls, databaseCalls: () => databaseCalls };
}

test("unauthorized sessions cannot access linked case records or invoke the database", async () => {
  const f = fixture({ authorized: false });
  assert.deepEqual(await f.read("support", ticketId), { status: "forbidden" });
  assert.deepEqual(await f.read("deletion", deletionId), { status: "forbidden" });
  assert.equal(f.databaseCalls(), 0);
});

test("invalid origin or case ID never reaches persistence", async () => {
  const f = fixture();
  assert.deepEqual(await f.read("users", ticketId), { status: "invalid" });
  assert.deepEqual(await f.read("support", "../somewhere"), { status: "invalid" });
  assert.equal(f.databaseCalls(), 0);
});

test("Support preview selects only limited deletion status and lifecycle fields", async () => {
  const f = fixture();
  const result = await f.read("support", ticketId);
  assert.deepEqual(result, {
    status: "ok",
    data: {
      kind: "deletion",
      id: deletionId,
      status: "CANCELLED",
      requestedAt: "2026-11-10T00:00:00.000Z",
      deletionScheduledAt: "2026-11-17T00:00:00.000Z",
      cancelledAt: "2026-11-14T00:00:00.000Z",
      completedAt: null,
    },
  });
  const read = f.calls.find(c => c.model === "accountDeletionRequest")!;
  const args = read.args as { where: Record<string, unknown>; select: Record<string, boolean> };
  assert.deepEqual(args.where, { supportTicketId: ticketId, userId });
  assert.equal((read.args as { take: number }).take, 2);
  for (const excluded of ["userId", "email", "reviewNotes", "adminReference", "supportTicketId", "user"]) {
    assert.equal(args.select[excluded], undefined, excluded + " must not be selected in a Support preview");
  }
});

test("Support cannot preview a deletion from a non-deletion ticket", async () => {
  const f = fixture({ ticket: supportSource({ category: "search-help" }) });
  assert.deepEqual(await f.read("support", ticketId), { status: "not_found" });
  assert.equal(f.calls.length, 1);
});

test("Support preview does not infer relationships from matching email or a different account", async () => {
  const f = fixture({ deletionMatch: null });
  assert.deepEqual(await f.read("support", ticketId), { status: "not_found" });
  const args = f.calls.at(-1)!.args as { where: Record<string, unknown> };
  assert.equal(args.where.supportTicketId, ticketId);
  assert.equal(args.where.userId, userId);
  assert.equal("email" in args.where, false);
});

test("ambiguous deletion records for one Support ticket are not exposed", async () => {
  const f = fixture({
    deletionMatches: [
      deletionPreview(),
      { ...deletionPreview(), id: "deletion_000002" },
    ],
  });
  assert.deepEqual(await f.read("support", ticketId), { status: "not_found" });
  const read = f.calls.find(c => c.model === "accountDeletionRequest")!;
  assert.equal((read.args as { take: number }).take, 2);
});

test("completed deletions remain readable after Support's account identity is detached", async () => {
  const f = fixture({
    ticket: supportSource({ userId: null }),
    deletionMatch: { ...deletionPreview(), status: "COMPLETED",
      completedAt: new Date("2026-11-17T00:00:00.000Z") },
  });
  const result = await f.read("support", ticketId);
  assert.equal(result.status, "ok");
  const where = (f.calls.at(-1)!.args as { where: unknown }).where;
  assert.deepEqual(where, { supportTicketId: ticketId, status: "COMPLETED" });
});

test("Deletion preview returns only safe Support ticket summary, not message bodies or actions", async () => {
  const f = fixture();
  const result = await f.read("deletion", deletionId);
  assert.deepEqual(result, {
    status: "ok",
    data: {
      kind: "support",
      id: ticketId,
      subject: "Account deletion request",
      category: "account_deletion",
      status: "RESOLVED",
      priority: "NORMAL",
      messageCount: 3,
      createdAt: "2026-11-10T00:00:00.000Z",
      updatedAt: "2026-11-14T00:00:00.000Z",
    },
  });
  const read = f.calls.find(c => c.model === "supportTicket" && c.method === "findFirst")!;
  const args = read.args as { where: Record<string, unknown>; select: Record<string, unknown> };
  assert.deepEqual(args.where, { id: ticketId, category: "account_deletion", userId });
  for (const excluded of ["messages", "sourceContext", "email", "userId", "user"]) {
    assert.equal(args.select[excluded], undefined, excluded + " must not be selected in a Deletion preview");
  }
});

test("Deletion preview requires a linked ticket ID and verified account ownership", async () => {
  const missing = fixture({ deletion: deletionSource({ supportTicketId: null }) });
  assert.deepEqual(await missing.read("deletion", deletionId), { status: "not_found" });
  assert.equal(missing.calls.length, 1);
  const unverified = fixture({ supportMatch: null });
  assert.deepEqual(await unverified.read("deletion", deletionId), { status: "not_found" });
});

test("Only a completed deletion may preview a ticket detached from its original user", async () => {
  const pending = fixture({ deletion: deletionSource({ status: "PENDING" }) });
  assert.equal((await pending.read("deletion", deletionId)).status, "ok");
  const pendingWhere = (pending.calls.at(-1)!.args as { where: Record<string, unknown> }).where;
  assert.equal(pendingWhere.userId, userId);
  assert.equal(pendingWhere.OR, undefined);

  const completed = fixture({ deletion: deletionSource({ status: "COMPLETED" }) });
  assert.equal((await completed.read("deletion", deletionId)).status, "ok");
  const completedWhere = (completed.calls.at(-1)!.args as { where: Record<string, unknown> }).where;
  assert.deepEqual(completedWhere.OR, [{ userId }, { userId: null }]);
});

test("missing source records and database outages never return fabricated case summaries", async () => {
  const missing = fixture({ ticket: null });
  assert.deepEqual(await missing.read("support", ticketId), { status: "not_found" });
  const unavailable = fixture({ databaseAvailable: false });
  assert.deepEqual(await unavailable.read("support", ticketId), { status: "unavailable" });
  const throws = fixture({ throwError: true });
  assert.deepEqual(await throws.read("deletion", deletionId), { status: "unavailable" });
});
