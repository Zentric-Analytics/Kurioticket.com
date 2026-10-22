import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { createVisitorToken, hashVisitorToken } from "@/lib/visitor-identity";
import { createVisitorIdentityService, type VisitorIdentityDatabase } from "./visitorIdentityCore";
import { retireAccountVisitors } from "./visitorAccountRetirement";
import type { LockedVisitorAccount } from "./visitorActivityIdentity";

type Visitor = {
  id: string;
  tokenHash: string;
  currentUserId: string | null;
  consentStatus: string;
  trackingDisabledAt: Date | null;
  lastSeenAt: Date;
  identityLinks: Array<{ userId: string }>;
  consentRecords: Array<{ policyVersion?: string | null; status: string }>;
  searchHistory: Array<{ userId: string | null }>;
  redirectLogs: Array<{ userId: string | null }>;
  analyticsEvents: Array<{ userId: string | null }>;
};
type Where = {
  id?: string;
  tokenHash?: string;
  currentUserId?: string | null;
  consentStatus?: string;
  trackingDisabledAt?: null;
  OR?: Where[];
  identityLinks?: { none?: { userId?: { not: string } }; some?: { userId: string } };
  searchHistory?: { some: { userId: string } };
  redirectLogs?: { some: { userId: string } };
  analyticsEvents?: { some: { userId: string } };
};

function fixture() {
  let rows: Visitor[] = [];
  let chain = Promise.resolve();
  let failConsent = false;
  let failDelete = false;
  let accounts = new Map<string, LockedVisitorAccount>(["account-a", "account-b"].map(id => [id, {
    id, email: `${id}@example.test`, role: "USER", status: "ACTIVE", emailVerified: new Date(),
  }]));
  const locks: string[] = [];
  const operations: string[] = [];
  const writes: unknown[] = [];
  function matches(row: Visitor, where: Where): boolean {
    if (where.id !== undefined && row.id !== where.id) return false;
    if (where.tokenHash !== undefined && row.tokenHash !== where.tokenHash) return false;
    if (where.currentUserId !== undefined && row.currentUserId !== where.currentUserId) return false;
    if (where.consentStatus !== undefined && row.consentStatus !== where.consentStatus) return false;
    if (where.trackingDisabledAt !== undefined && row.trackingDisabledAt !== where.trackingDisabledAt) return false;
    if (where.OR && !where.OR.some(item => matches(row, item))) return false;
    const none = where.identityLinks?.none;
    if (none && row.identityLinks.some(link => !none.userId || link.userId !== none.userId.not)) return false;
    if (where.identityLinks?.some && !row.identityLinks.some(link => link.userId === where.identityLinks!.some!.userId)) return false;
    for (const field of ["searchHistory", "redirectLogs", "analyticsEvents"] as const) {
      if (where[field] && !row[field].some(activity => activity.userId === where[field]!.some.userId)) return false;
    }
    return true;
  }
  const models = {
    visitor: {
      async findUnique({ where }: { where: Where }) { return structuredClone(rows.find(row => matches(row, where)) ?? null); },
      async findFirst({ where }: { where: Where }) { return structuredClone(rows.find(row => matches(row, where)) ?? null); },
      async findMany({ where }: { where: Where }) { return structuredClone(rows.filter(row => matches(row, where)).sort((a, b) => a.id.localeCompare(b.id))); },
      async create({ data }: { data: { tokenHash: string; consentRecords: { create: { policyVersion?: string; status: string } } } }) {
        writes.push(data);
        const row: Visitor = { id: `visitor-${rows.length + 1}`, tokenHash: data.tokenHash, currentUserId: null, consentStatus: "GRANTED", trackingDisabledAt: null, lastSeenAt: new Date(), identityLinks: [], consentRecords: [data.consentRecords.create], searchHistory: [], redirectLogs: [], analyticsEvents: [] };
        rows.push(row);
        return { id: row.id };
      },
      async updateMany({ where, data }: { where: Where; data: Partial<Visitor> }) {
        writes.push({ where, data });
        const matching = rows.filter(row => matches(row, where));
        matching.forEach(row => Object.assign(row, data));
        return { count: matching.length };
      },
      async update({ where, data }: { where: Where; data: Partial<Visitor> }) {
        const row = rows.find(item => matches(item, where));
        assert.ok(row);
        Object.assign(row, data);
        return row;
      },
    },
    visitorIdentityLink: {
      async upsert({ create }: { create: { visitorId: string; userId: string } }) {
        const row = rows.find(item => item.id === create.visitorId)!;
        if (!row.identityLinks.some(link => link.userId === create.userId)) row.identityLinks.push({ userId: create.userId });
        return create;
      },
      async deleteMany({ where }: { where: { visitorId: string } }) {
        const row = rows.find(item => item.id === where.visitorId)!;
        row.identityLinks = [];
        return { count: 1 };
      },
    },
    visitorConsent: {
      async create({ data }: { data: { visitorId: string; status: string; policyVersion?: string } }) {
        if (failConsent) throw new Error("private storage failure");
        rows.find(item => item.id === data.visitorId)!.consentRecords.unshift(data);
        return data;
      },
    },
    user: {
      async delete({ where }: { where: { id: string } }) {
        if (failDelete) throw new Error("Account deletion restricted by retained request");
        accounts.delete(where.id);
        for (const visitor of rows) {
          if (visitor.currentUserId === where.id) visitor.currentUserId = null;
          visitor.identityLinks = visitor.identityLinks.filter(link => link.userId !== where.id);
          for (const field of ["searchHistory", "redirectLogs", "analyticsEvents"] as const) {
            for (const activity of visitor[field]) if (activity.userId === where.id) activity.userId = null;
          }
        }
      },
    },
    async $queryRaw(query: TemplateStringsArray, id: string) {
      if (query.join("").includes('FROM "User"')) {
        operations.push(`account:${id}`);
        return accounts.has(id) ? [structuredClone(accounts.get(id)!)] : [];
      }
      operations.push(`visitor:${id}`);
      return rows.some(row => row.id === id) ? [{ id }] : [];
    },
    async $executeRaw(_query: TemplateStringsArray, tokenHash: string) {
      locks.push(tokenHash);
      operations.push("credential");
      return 1;
    },
  };
  const db = {
    ...models,
    async $transaction<T>(callback: (tx: typeof models) => Promise<T>) {
      // Emulate serialised per-identity transactions and rollback for deterministic race tests.
      const previous = chain;
      let release!: () => void;
      chain = new Promise<void>(resolve => { release = resolve; });
      await previous;
      const snapshot = structuredClone(rows);
      const accountSnapshot = structuredClone(accounts);
      try { return await callback(models); }
      catch (error) { rows = snapshot; accounts = accountSnapshot; throw error; }
      finally { release(); }
    },
  };
  return {
    service: createVisitorIdentityService(() => db as unknown as VisitorIdentityDatabase), rows: () => rows,
    accounts: () => accounts, locks, operations, writes,
    setFailConsent: (value: boolean) => { failConsent = value; },
    setFailDelete: (value: boolean) => { failDelete = value; },
    retire: (userId: string, removeAccount = true) => db.$transaction(async tx => {
      const result = await retireAccountVisitors(tx as unknown as Prisma.TransactionClient, userId);
      if (removeAccount) await tx.user.delete({ where: { id: userId } });
      return result;
    }),
  };
}

test("explicit grants are random, hashed and idempotent; status checks create no grants", async () => {
  const f = fixture();
  const supplied = createVisitorToken();
  const first = await f.service.registerAnalyticsVisitor({ token: supplied, policyVersion: "v1" });
  assert.notEqual(first.token, supplied, "unknown client-selected tokens are not adopted");
  assert.equal(f.rows()[0].tokenHash, hashVisitorToken(first.token));
  assert.equal(JSON.stringify(f.writes).includes(first.token), false);
  const again = await f.service.registerAnalyticsVisitor({ token: first.token, policyVersion: "v1" });
  assert.deepEqual(again, { id: first.id, token: first.token, created: false });
  assert.deepEqual(await f.service.getAnalyticsVisitorStatus(first.token), { analyticsTracking: "enabled", linked: false });
  assert.equal(f.rows()[0].consentRecords.length, 1);
  await f.service.registerAnalyticsVisitor({ token: first.token, policyVersion: "v2" });
  assert.equal(f.rows()[0].consentRecords.length, 2);
  assert.equal(f.locks.includes(first.token), false);
});

test("an anonymous visitor can be claimed once, and signed-out or other accounts cannot resolve it", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({});
  const claim = { token: visitor.token, userId: "account-a", source: "SIGN_IN" as const };
  assert.equal(await f.service.linkVisitorToUser(claim), visitor.id);
  assert.equal(await f.service.linkVisitorToUser(claim), visitor.id);
  assert.equal(await f.service.resolveConsentedVisitorId(visitor.token, "account-a"), visitor.id);
  assert.equal(await f.service.resolveConsentedVisitorId(visitor.token, null), null);
  assert.equal(await f.service.resolveConsentedVisitorId(visitor.token, "account-b"), null);
  assert.equal(await f.service.linkVisitorToUser({ ...claim, userId: "account-b" }), null);
  assert.deepEqual(f.rows()[0].identityLinks, [{ userId: "account-a" }]);
  assert.deepEqual(await f.service.getAnalyticsVisitorStatus(visitor.token, "account-a"), { analyticsTracking: "enabled", linked: true });
  assert.deepEqual(await f.service.getAnalyticsVisitorStatus(visitor.token), { analyticsTracking: "disabled", linked: false });
});

test("competing account claims cannot attach one visitor to both accounts", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({});
  const results = await Promise.all(["account-a", "account-b"].map(userId => f.service.linkVisitorToUser({ token: visitor.token, userId, source: "SIGN_IN" })));
  assert.deepEqual(results, [visitor.id, null]);
  assert.equal(f.rows()[0].identityLinks.length, 1);
  assert.equal(f.locks.filter(value => value === hashVisitorToken(visitor.token)).length, 2);
  assert.ok(f.writes.some(write => JSON.stringify(write).includes('"none":{"userId":{"not":"account-a"}}')));
});

test("logout and account changes rotate identities while preserving prior account history", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({ policyVersion: "v1" });
  await f.service.linkVisitorToUser({ token: visitor.token, userId: "account-a", source: "SIGN_IN" });
  const guest = await f.service.registerAnalyticsVisitor({ token: visitor.token, userId: null, policyVersion: "v1" });
  assert.notEqual(guest.id, visitor.id);
  const other = await f.service.mergeAnalyticsVisitor({ token: visitor.token, userId: "account-b", source: "SIGN_IN" });
  assert.ok(other);
  assert.notEqual(other.id, visitor.id);
  assert.deepEqual(f.rows()[0].identityLinks, [{ userId: "account-a" }]);
  assert.equal(f.rows()[0].currentUserId, "account-a");
  assert.deepEqual(f.rows().find(row => row.id === other.id)!.identityLinks, [{ userId: "account-b" }]);
  assert.equal(await f.service.resolveConsentedVisitorId(other.token, "account-b"), other.id);
});

test("legacy mixed-account links are rejected even if currentUserId matches", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({});
  f.rows()[0].currentUserId = "account-a";
  f.rows()[0].identityLinks = [{ userId: "account-a" }, { userId: "account-b" }];
  assert.equal(await f.service.resolveConsentedVisitorId(visitor.token, "account-a"), null);
  assert.equal(await f.service.linkVisitorToUser({ token: visitor.token, userId: "account-a", source: "SIGN_IN" }), null);
  const rotated = await f.service.mergeAnalyticsVisitor({ token: visitor.token, userId: "account-a", source: "SIGN_IN" });
  assert.ok(rotated);
  assert.notEqual(rotated.id, visitor.id);
  assert.equal(f.rows()[0].identityLinks.length, 2);
});

test("withdrawal disables, unlinks and records once; regrant never revives old history", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({});
  await f.service.linkVisitorToUser({ token: visitor.token, userId: "account-a", source: "SIGN_IN" });
  assert.equal(await f.service.withdrawAnalyticsConsent(visitor.token), true);
  assert.equal(await f.service.withdrawAnalyticsConsent(visitor.token), true);
  assert.equal(f.rows()[0].consentStatus, "WITHDRAWN");
  assert.equal(f.rows()[0].consentRecords.length, 2);
  assert.deepEqual(f.rows()[0].identityLinks, []);
  assert.equal(await f.service.resolveConsentedVisitorId(visitor.token, "account-a"), null);
  assert.equal(await f.service.mergeAnalyticsVisitor({ token: visitor.token, userId: "account-b", source: "ACCOUNT_API" }), null);
  const regranted = await f.service.registerAnalyticsVisitor({ token: visitor.token });
  assert.notEqual(regranted.id, visitor.id);
  assert.equal(f.rows()[0].consentStatus, "WITHDRAWN");
});

test("withdrawal transaction failures roll back and remain retryable", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({});
  await f.service.linkVisitorToUser({ token: visitor.token, userId: "account-a", source: "SIGN_IN" });
  f.setFailConsent(true);
  await assert.rejects(f.service.withdrawAnalyticsConsent(visitor.token), /storage failure/);
  assert.equal(f.rows()[0].consentStatus, "GRANTED");
  assert.deepEqual(f.rows()[0].identityLinks, [{ userId: "account-a" }]);
  f.setFailConsent(false);
  assert.equal(await f.service.withdrawAnalyticsConsent(visitor.token), true);
});

test("missing database never pretends consent mutations succeeded; optional attribution fails closed", async () => {
  const service = createVisitorIdentityService(() => null);
  const token = createVisitorToken();
  await assert.rejects(service.registerAnalyticsVisitor({}), /unavailable/);
  await assert.rejects(service.withdrawAnalyticsConsent(token), /unavailable/);
  await assert.rejects(service.getAnalyticsVisitorStatus(token), /unavailable/);
  assert.equal(await service.resolveConsentedVisitorId(token), null);
  assert.equal(await service.withdrawAnalyticsConsent(null), true);
  assert.equal(await service.mergeAnalyticsVisitor({ token: null, userId: "account-a", source: "ACCOUNT_API" }), null);
});

test("claims recheck active verified accounts before locking or changing a visitor", async () => {
  const variants = ["SUSPENDED", "PENDING_DELETION", "DELETED", "unverified", "missing"] as const;
  for (const state of variants) {
    const f = fixture();
    const visitor = await f.service.registerAnalyticsVisitor({});
    if (state === "missing") f.accounts().delete("account-a");
    else if (state === "unverified") f.accounts().get("account-a")!.emailVerified = null;
    else f.accounts().get("account-a")!.status = state;
    const input = { token: visitor.token, userId: "account-a", source: "SIGN_IN" as const };
    assert.equal(await f.service.linkVisitorToUser(input), null, state);
    assert.equal(await f.service.mergeAnalyticsVisitor(input), null, state);
    assert.deepEqual(f.operations, ["account:account-a", "account:account-a"]);
    assert.equal(f.rows().length, 1);
    assert.equal(f.rows()[0].currentUserId, null);
  }
});

test("permanent deletion retires the old credential before its account links are cleared", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({});
  await f.service.linkVisitorToUser({ token: visitor.token, userId: "account-a", source: "SIGN_IN" });
  f.rows()[0].searchHistory.push({ userId: "account-a" });
  f.accounts().get("account-a")!.status = "DELETED";
  f.operations.length = 0;

  assert.deepEqual(await f.retire("account-a"), { visitorsRetired: 1 });
  assert.equal(f.operations[0], "account:account-a");
  assert.ok(f.operations.indexOf("credential") < f.operations.indexOf(`visitor:${visitor.id}`));
  assert.equal(f.accounts().has("account-a"), false);
  assert.equal(f.rows()[0].consentStatus, "WITHDRAWN");
  assert.ok(f.rows()[0].trackingDisabledAt);
  assert.equal(f.rows()[0].currentUserId, null);
  assert.deepEqual(f.rows()[0].identityLinks, []);
  assert.deepEqual(f.rows()[0].searchHistory, [{ userId: null }], "retained history is not purged");
  assert.equal(f.rows()[0].consentRecords.filter(record => record.status === "WITHDRAWN").length, 1);
  assert.equal(await f.service.resolveConsentedVisitorId(visitor.token), null);
  assert.equal(await f.service.mergeAnalyticsVisitor({ token: visitor.token, userId: "account-b", source: "SIGN_IN" }), null);
  const fresh = await f.service.registerAnalyticsVisitor({ token: visitor.token });
  assert.notEqual(fresh.id, visitor.id, "an explicit new grant cannot revive retired history");
});

test("retirement includes historical links and pre-merge activity without retiring unrelated guests", async () => {
  const f = fixture();
  for (let index = 0; index < 5; index += 1) await f.service.registerAnalyticsVisitor({});
  f.rows()[0].identityLinks = [{ userId: "account-a" }, { userId: "account-b" }];
  f.rows()[0].currentUserId = "account-b";
  f.rows()[1].searchHistory.push({ userId: "account-a" });
  f.rows()[2].redirectLogs.push({ userId: "account-a" });
  f.rows()[3].analyticsEvents.push({ userId: "account-a" });
  f.accounts().get("account-a")!.status = "DELETED";

  assert.deepEqual(await f.retire("account-a"), { visitorsRetired: 4 });
  assert.ok(f.rows().slice(0, 4).every(row => row.consentStatus === "WITHDRAWN" && row.identityLinks.length === 0));
  assert.equal(f.rows()[4].consentStatus, "GRANTED");
  assert.equal(f.rows()[4].trackingDisabledAt, null);
});

test("failed permanent deletion rolls back retirement and its consent audit", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({});
  await f.service.linkVisitorToUser({ token: visitor.token, userId: "account-a", source: "SIGN_IN" });
  f.accounts().get("account-a")!.status = "DELETED";
  f.setFailDelete(true);
  await assert.rejects(f.retire("account-a"), /restricted/);
  assert.equal(f.accounts().has("account-a"), true);
  assert.equal(f.rows()[0].consentStatus, "GRANTED");
  assert.equal(f.rows()[0].trackingDisabledAt, null);
  assert.deepEqual(f.rows()[0].identityLinks, [{ userId: "account-a" }]);
  assert.equal(f.rows()[0].consentRecords.length, 1);
  f.setFailDelete(false);
  assert.deepEqual(await f.retire("account-a"), { visitorsRetired: 1 });
});

test("retirement is idempotent and refuses an account reactivated before its lock", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({});
  await f.service.linkVisitorToUser({ token: visitor.token, userId: "account-a", source: "SIGN_IN" });
  await assert.rejects(f.retire("account-a"), /requires a deleted account/);
  assert.equal(f.rows()[0].consentStatus, "GRANTED");
  f.accounts().get("account-a")!.status = "DELETED";
  assert.deepEqual(await f.retire("account-a", false), { visitorsRetired: 1 });
  assert.deepEqual(await f.retire("account-a", false), { visitorsRetired: 0 });
  assert.equal(f.rows()[0].consentRecords.filter(record => record.status === "WITHDRAWN").length, 1);
});

test("a queued stale account claim cannot revive a visitor after deletion commits", async () => {
  const f = fixture();
  const visitor = await f.service.registerAnalyticsVisitor({});
  await f.service.linkVisitorToUser({ token: visitor.token, userId: "account-a", source: "SIGN_IN" });
  f.accounts().get("account-a")!.status = "DELETED";
  const [retired, merged] = await Promise.all([
    f.retire("account-a"),
    f.service.mergeAnalyticsVisitor({ token: visitor.token, userId: "account-a", source: "SIGN_IN" }),
  ]);
  assert.deepEqual(retired, { visitorsRetired: 1 });
  assert.equal(merged, null);
  assert.equal(f.rows().length, 1);
  assert.equal(f.rows()[0].consentStatus, "WITHDRAWN");
});
