import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";

import { withEnvironmentMetadata } from "@/lib/stagingSafety";
import { createAnalyticsEventRecorder } from "./analyticsService";
import { createOperationalAccountAuditRecorder, writeOperationalAccountAudit, type OperationalAccountAuditInput } from "./operationalAccountAuditService";
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

test("optional analytics writes only after a consented row is locked", async () => {
  const f = recorderFixture();
  await f.record({ visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" });
  assert.equal(f.events[0].visitorId, "visitor-a");
  assert.equal(f.events[0].userId, undefined);
  assert.deepEqual(f.operations, ["visitor-lock", "consent-read", "event-write"]);
});

test("withdrawal before the analytics write blocks the entire optional record", async () => {
  const f = recorderFixture();
  f.beforeVisitorRead(() => {
    f.visitor()!.consentStatus = "WITHDRAWN";
    f.visitor()!.trackingDisabledAt = new Date();
  });
  await f.record({ visitorId: "visitor-a", type: "REDIRECT", name: "hotel_partner_redirect" });
  assert.equal(f.events.length, 0);
  assert.deepEqual(f.operations, ["visitor-lock", "consent-read"]);
});

test("withdrawal blocks analytics even for an authenticated account", async () => {
  const f = recorderFixture();
  f.setVisitor({ currentUserId: null, consentStatus: "WITHDRAWN", trackingDisabledAt: new Date(), identityLinks: [] });
  await f.record({ userId: "account-a", visitorId: "visitor-a", type: "SEARCH", name: "flight_search" });
  assert.equal(f.events.length, 0);
  assert.deepEqual(f.operations, ["account-lock", "visitor-lock", "consent-read"]);
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
    assert.equal(mixed.events.length, 0);
  }
});

test("inactive or unverified accounts cannot attach visitor analytics", async () => {
  for (const state of ["inactive", "unverified"] as const) {
    const f = recorderFixture();
    if (state === "inactive") f.account.status = "DELETED";
    else f.account.emailVerified = null;
    await f.record({ userId: "account-a", visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" });
    assert.equal(f.events.length, 0);
    assert.deepEqual(f.operations, ["account-lock"]);
  }
});

test("missing visitor rows and optional analytics storage failures never reject the business action", async () => {
  const f = recorderFixture();
  f.setVisitor(null);
  await f.record({ visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" });
  assert.equal(f.events.length, 0);
  const valid = recorderFixture();
  valid.setFailWrite();
  await assert.doesNotReject(valid.record({ visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" }));
  assert.equal(valid.events.length, 0);
  await assert.doesNotReject(createAnalyticsEventRecorder(() => null)({ visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" }));
  await assert.doesNotReject(createAnalyticsEventRecorder(() => { throw new Error("database unavailable"); })({ visitorId: "visitor-a", type: "SEARCH", name: "hotel_search" }));
});

test("no analytics consent means zero event writes for guest and signed-in account", async () => {
  for (const userId of [undefined, "account-a"]) {
    const f = recorderFixture();
    await f.record({ userId, type: "SEARCH", name: "flight_search" });
    await f.record({ userId, visitorId: null, type: "REDIRECT", name: "flight_partner_redirect" });
    assert.deepEqual(f.events, []);
    assert.deepEqual(f.operations, [], "no database transaction required without consent");
  }
});

test("essential account audit preserves confirmed mutations but cannot accept optional fields or visitor identity", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  const writes: Array<Record<string, unknown>> = [];
  const db = { analyticsEvent: { create: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); } } };
  const audit = createOperationalAccountAuditRecorder(() => db as never);
  const inputs: OperationalAccountAuditInput[] = [
    { userId: "account-a", type: "SIGNUP", name: "password_signup" },
    { userId: "account-a", type: "SUPPORT_TICKET", name: "support_ticket_created", metadata: { category: "search-help" } },
    ...(["price_alert_created", "price_alert_paused", "price_alert_reactivated", "price_alert_deleted"] as const).map(name => ({
      userId: "account-a", type: "ALERT_CREATED" as const, name,
      metadata: { product: "FLIGHT" as const, mode: "TARGET" as const, alertId: "alert-a", outcome: "confirmed" as const },
    })),
    ...(["saved_item_confirmed", "saved_item_removed"] as const).map(name => ({
      userId: "account-a", type: "SAVE" as const, name,
      metadata: { product: "CAR" as const, savedType: "car" as const, savedItemId: "saved-a", resultId: "offer-a", outcome: "confirmed", applicationSource: "IOS" as const },
    })),
  ];
  for (const input of inputs) {
    const tampered = { ...input, visitorId: "not-audit", metadata: {
      ...("metadata" in input ? input.metadata : {}), pageKey: "home", linkedJourneyId: "optional", recordPurpose: "optional_analytics",
    } } as unknown as OperationalAccountAuditInput;
    await audit(tampered);
  }
  assert.equal(writes.length, inputs.length);
  for (const row of writes) {
    assert.equal(row.userId, "account-a");
    assert.equal(row.visitorId, undefined);
    const metadata = row.metadata as Record<string, unknown>;
    assert.equal(metadata.recordPurpose, "essential_account_audit");
    assert.equal(metadata.environment, "staging");
    assert.equal(metadata.pageKey, undefined);
    assert.equal(metadata.linkedJourneyId, undefined);
  }
  await audit({ userId: "account-a", type: "SHARE", name: "share_link_copied" } as never);
  await audit({ userId: "", type: "SIGNUP", name: "password_signup" });
  assert.equal(writes.length, inputs.length, "optional events and missing account owners never enter account audit");
});

test("account audit failures remain best effort except when the caller requires atomic storage", async () => {
  const failing = { analyticsEvent: { create: async () => { throw new Error("unavailable"); } } };
  const input = { userId: "account-a", type: "SIGNUP", name: "password_signup" } as const;
  await assert.doesNotReject(createOperationalAccountAuditRecorder(() => failing as never)(input));
  await assert.rejects(writeOperationalAccountAudit(failing as never, input));
});
