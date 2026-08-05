import assert from "node:assert/strict";
import test from "node:test";
import { createMobileAccountDeletionHandler } from "./route";

const requestRecord = {
  id: "delete-1",
  userId: "user-1",
  email: "traveler@example.com",
  status: "PENDING" as const,
  requestedAt: new Date("2026-08-04T00:00:00.000Z"),
  deletionScheduledAt: new Date("2026-08-11T00:00:00.000Z"),
  cancelledAt: null,
  completedAt: null,
  supportTicketId: "ticket-1",
  adminNotificationId: null,
  userReason: null,
  cancellationMetadata: null,
  reviewNotes: null,
  createdAt: new Date("2026-08-04T00:00:00.000Z"),
  updatedAt: new Date("2026-08-04T00:00:00.000Z"),
};

test("mobile account deletion requires an active authenticated session", async () => {
  const handler = createMobileAccountDeletionHandler({
    getSession: async () => null,
    requestDeletion: async () => { throw new Error("must not run"); },
  });
  const response = await handler(new Request("https://kurioticket.com/api/mobile/v1/account/deletion-request", { method: "POST" }));
  assert.equal(response.status, 401);
});

test("mobile account deletion starts the existing seven-day reviewed workflow", async () => {
  let received: { userId: string; email: string } | undefined;
  const handler = createMobileAccountDeletionHandler({
    getSession: async () => ({
      id: "session-1", sessionToken: "token", userId: "user-1", expires: new Date("2026-09-01T00:00:00.000Z"),
      user: { id: "user-1", email: "traveler@example.com", name: "Traveler", image: null, status: "ACTIVE", accounts: [] },
    }),
    requestDeletion: async (input) => { received = input; return { request: requestRecord, created: true }; },
  });
  const response = await handler(new Request("https://kurioticket.com/api/mobile/v1/account/deletion-request", { method: "POST" }));
  assert.equal(response.status, 201);
  assert.deepEqual(received, { userId: "user-1", email: "traveler@example.com" });
  assert.deepEqual(await response.json(), {
    request: {
      id: "delete-1", status: "PENDING", requestedAt: "2026-08-04T00:00:00.000Z", deletionScheduledAt: "2026-08-11T00:00:00.000Z",
      cancelledAt: null, completedAt: null, supportTicketId: "ticket-1",
    },
    message: "Your account is disabled and the deletion request becomes eligible for review in 7 days. Retention requirements are reviewed before deletion is completed.",
    created: true,
  });
});

test("mobile account deletion does not expose internal errors", async () => {
  const handler = createMobileAccountDeletionHandler({
    getSession: async () => ({
      id: "session-1", sessionToken: "token", userId: "user-1", expires: new Date("2026-09-01T00:00:00.000Z"),
      user: { id: "user-1", email: "traveler@example.com", name: null, image: null, status: "ACTIVE", accounts: [] },
    }),
    requestDeletion: async () => { throw new Error("database details"); },
  });
  const response = await handler(new Request("https://kurioticket.com/api/mobile/v1/account/deletion-request", { method: "POST" }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Unable to request account deletion." });
});
