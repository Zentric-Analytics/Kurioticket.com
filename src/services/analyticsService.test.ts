import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";

import { withEnvironmentMetadata } from "@/lib/stagingSafety";
import { createAnalyticsEventRecorder } from "./analyticsService";
import type { LockedVisitorAccount } from "./visitorActivityIdentity";

const originalUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalUrl;
});

test("analytics, provider, and search metadata receive the staging environment dimension", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  const metadata = withEnvironmentMetadata({ operation: "search" });
  assert.deepEqual(metadata, { operation: "search", environment: "staging" });
});

test("Production metadata retains its data and reports production", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  assert.deepEqual(withEnvironmentMetadata({ operation: "search" }), {
    operation: "search",
    environment: "production",
  });
});

function recorderFixture() {
  let visitor: {
    currentUserId: string | null;
    consentStatus: "GRANTED" | "WITHDRAWN";
    trackingDisabledAt: Date | null;
    identityLinks: Array<{ userId: string }>;
  } | null = { currentUserId: null, consentStatus: "GRANTED", trackingDisabledAt: null, identityLinks: [] };
  const account: LockedVisitorAccount = {
    id: "account-a", email: "account@example.test", role: "USER", status: "ACTIVE", emailVerified: new Date(),
  };
  const events: Array<{ userId?: string; visitorId?: string; metadata: unknown }> = [];
  const operations: string[] = [];
  let beforeVisitorRead = () => {};
  let failWrite = false;
  let inTransaction = false;
  const tx = {
    async $queryRaw(query: TemplateStringsArray) {
      assert.equal(inTransaction, true);
      if (query.join("").includes('FROM "User"')) {
        operations.push("account-lock");
        return [account];
      }
      operations.push("visitor-lock");
      beforeVisitorRead();
      return visitor ? [{ id: "visitor-a" }] : [];
    },
    visitor: { async findUnique() { operations.push("consent-read"); return visitor; } },
    analyticsEvent: {
      async create({ data }: { data: { userId?: string; visitorId?: string; metadata: unknown } }) {
        assert.equal(inTransaction, true);
        operations.push("event-write");
        if (failWrite) throw new Error("private database payload");
        events.push(data);
      },
    },
  };
  const db = { async $transaction<T>(write: (transaction: typeof tx) => Promise<T>) {
    inTransaction = true;
    try { return await write(tx); }
    finally { inTransaction = false; }
  } };
  return {
    record: createAnalyticsEventRecorder(() => db as unknown as Pick<PrismaClient, "$transaction">),
    events, operations, account,
    visitor: () => visitor,
    setVisitor: (value: typeof visitor) => { visitor = value; },
    beforeVisitorRead: (work: () => void) => { beforeVisitorRead = work; },
    setFailWrite: () => { failWrite = true; },
  };
}

test("legacy analytics keep guest attribution only after a consented row is locked", async () => {
  const f = recorderFixture();
  await f.record({ visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" });
  assert.equal(f.events[0].visitorId, "visitor-a");
  assert.equal(f.events[0].userId, undefined);
  assert.deepEqual(f.operations, ["visitor-lock", "consent-read", "event-write"]);
});

test("withdrawal before the analytics write strips a stale resolved visitor", async () => {
  const f = recorderFixture();
  f.beforeVisitorRead(() => {
    f.visitor()!.consentStatus = "WITHDRAWN";
    f.visitor()!.trackingDisabledAt = new Date();
  });
  await f.record({ visitorId: "visitor-a", type: "REDIRECT", name: "hotel_partner_redirect" });
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0].visitorId, undefined);
  assert.equal(f.events[0].userId, undefined);
});

test("withdrawal removes visitor attribution while preserving the independent operational account", async () => {
  const f = recorderFixture();
  f.setVisitor({ currentUserId: null, consentStatus: "WITHDRAWN", trackingDisabledAt: new Date(), identityLinks: [] });
  await f.record({ userId: "account-a", visitorId: "visitor-a", type: "SEARCH", name: "flight_search" });
  assert.equal(f.events[0].userId, "account-a");
  assert.equal(f.events[0].visitorId, undefined);
  assert.deepEqual(f.operations, ["account-lock", "visitor-lock", "consent-read", "event-write"]);
});

test("a linked account is accepted only with its own exclusively linked visitor", async () => {
  const valid = recorderFixture();
  valid.setVisitor({ currentUserId: "account-a", consentStatus: "GRANTED", trackingDisabledAt: null, identityLinks: [{ userId: "account-a" }] });
  await valid.record({ userId: "account-a", visitorId: "visitor-a", type: "REDIRECT", name: "flight_partner_redirect" });
  assert.equal(valid.events[0].visitorId, "visitor-a");
  assert.equal(valid.operations[0], "account-lock");

  for (const userId of [undefined, "account-a"]) {
    const mixed = recorderFixture();
    mixed.setVisitor({ currentUserId: "account-a", consentStatus: "GRANTED", trackingDisabledAt: null, identityLinks: [{ userId: "account-a" }, { userId: "account-b" }] });
    await mixed.record({ userId, visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" });
    assert.equal(mixed.events[0].visitorId, undefined);
    assert.equal(mixed.events[0].userId, userId);
  }
});

test("inactive or unverified accounts cannot attach visitor analytics", async () => {
  for (const state of ["inactive", "unverified"] as const) {
    const f = recorderFixture();
    if (state === "inactive") f.account.status = "DELETED";
    else f.account.emailVerified = null;
    await f.record({ userId: "account-a", visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" });
    assert.equal(f.events[0].visitorId, undefined);
    assert.equal(f.events[0].userId, "account-a");
    assert.deepEqual(f.operations, ["account-lock", "event-write"]);
  }
});

test("missing visitor rows and optional analytics storage failures never reject the business action", async () => {
  const f = recorderFixture();
  f.setVisitor(null);
  await f.record({ visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" });
  assert.equal(f.events[0].visitorId, undefined);
  f.setFailWrite();
  await assert.doesNotReject(f.record({ userId: "account-a", type: "SIGNUP", name: "signup" }));
  await assert.doesNotReject(createAnalyticsEventRecorder(() => null)({ type: "SAVE", name: "saved" }));
  await assert.doesNotReject(createAnalyticsEventRecorder(() => { throw new Error("database unavailable"); })({ type: "SAVE", name: "saved" }));
});
