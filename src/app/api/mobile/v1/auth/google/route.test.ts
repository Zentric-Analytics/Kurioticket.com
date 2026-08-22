import assert from "node:assert/strict";
import test from "node:test";
import { getOrCreateGoogleUser } from "./route";

const input = {
  providerAccountId: "google-subject",
  email: "qa@example.com",
  name: "Google Name",
  image: "https://example.com/avatar.png",
};

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: input.email,
    emailVerified: new Date("2026-01-01T00:00:00Z"),
    name: "Existing Name",
    image: "https://example.com/existing.png",
    status: "ACTIVE",
    ...overrides,
  };
}

function database(options: {
  accountUser?: ReturnType<typeof user> | null;
  emailUser?: ReturnType<typeof user> | null;
}) {
  const calls = {
    accountCreates: 0,
    userCreates: 0,
    userCreateData: null as Record<string, unknown> | null,
    userUpdates: [] as Array<Record<string, unknown>>,
  };
  const tx = {
    account: {
      findUnique: async () => options.accountUser ? { user: options.accountUser } : null,
      create: async () => { calls.accountCreates += 1; },
    },
    user: {
      findUnique: async () => options.emailUser ?? null,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        calls.userUpdates.push(data);
        return { ...(options.accountUser ?? options.emailUser), ...data };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.userCreates += 1;
        calls.userCreateData = data;
        return { id: "new-user", status: "ACTIVE", ...data };
      },
    },
  };
  const db = { $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx) };
  return { db, calls };
}

test("existing verified ACTIVE Google account is returned unchanged", async () => {
  const existing = user();
  const { db, calls } = database({ accountUser: existing });
  assert.equal(await getOrCreateGoogleUser(input, db as never), existing);
  assert.equal(calls.userUpdates.length, 0);
});

test("existing ACTIVE Google account synchronizes missing email verification", async () => {
  const { db, calls } = database({ accountUser: user({ emailVerified: null }) });
  const result = await getOrCreateGoogleUser(input, db as never);
  assert.ok(result.emailVerified instanceof Date);
  assert.equal(calls.userUpdates.length, 1);
});

for (const status of ["SUSPENDED", "PENDING_DELETION", "DELETED"]) {
  test(`existing ${status} Google account remains unchanged`, async () => {
    const existing = user({ status, emailVerified: null });
    const { db, calls } = database({ accountUser: existing });
    assert.equal(await getOrCreateGoogleUser(input, db as never), existing);
    assert.equal(calls.userUpdates.length, 0);
  });
}

test("existing email-only ACTIVE user is linked and verified", async () => {
  const { db, calls } = database({ accountUser: null, emailUser: user({ emailVerified: null }) });
  const result = await getOrCreateGoogleUser(input, db as never);
  assert.ok(result.emailVerified instanceof Date);
  assert.equal(calls.accountCreates, 1);
});

test("new Google user is ACTIVE and verified with one provider relation", async () => {
  const { db, calls } = database({ accountUser: null, emailUser: null });
  const result = await getOrCreateGoogleUser(input, db as never);
  assert.equal(result.status, "ACTIVE");
  assert.ok(result.emailVerified instanceof Date);
  assert.equal(calls.userCreates, 1);
  assert.equal(
    ((calls.userCreateData?.accounts as { create: { provider: string } }).create.provider),
    "google",
  );
});

test("existing provider subject cannot be silently relinked to a conflicting email", async () => {
  const { db } = database({ accountUser: user({ email: "different@example.com", emailVerified: null }) });
  await assert.rejects(() => getOrCreateGoogleUser(input, db as never), /does not match/);
});
