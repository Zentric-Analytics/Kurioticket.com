import assert from "node:assert/strict";
import test from "node:test";
import { readExpandedAdminAlertSignals, type ExpandedAlertDatabase } from "./adminExpandedAlertReader";

const now = new Date("2026-11-04T14:00:00.000Z");
function database() {
  const calls: Array<{ operation: string; args: any }> = [];
  const tx = {
    searchHistory: { groupBy: async (args: any) => { calls.push({ operation: "search", args }); return []; } },
    featureFlag: { findMany: async (args: any) => { calls.push({ operation: "flags", args }); return [{ key: "FLIGHT_SEARCH_ENABLED", enabled: false }]; } },
  };
  const db = {
    $transaction: async (run: (db: any) => Promise<any>, options: any) => { calls.push({ operation: "transaction", args: options }); return run(tx); },
    supportTicket: { groupBy: async (args: any) => { calls.push({ operation: "support", args }); return [{ status: "OPEN", _count: { _all: 2 }, _max: { updatedAt: new Date("2026-11-04T13:00:00Z") } }]; } },
    userSecuritySettings: { aggregate: async (args: any) => { calls.push({ operation: "users", args }); return { _count: { _all: 0 }, _max: { twoFactorDisabledAt: null } }; } },
  };
  return { db, tx, calls };
}
test("search reads use exact environment, adjacent bounded windows, and authoritative feature controls", async () => {
  const { db, calls } = database();
  const result = await readExpandedAdminAlertSignals(db as unknown as ExpandedAlertDatabase, "staging", now);
  assert.equal(result.environment, "staging");
  const searches = calls.filter(c => c.operation === "search");
  assert.equal(searches.length, 2);
  for (const { args } of searches) {
    assert.deepEqual(args.where.query, { path: ["environment"], equals: "staging" });
    assert.deepEqual(args.by, ["type", "status"]);
    assert.deepEqual(args.where.type, { in: ["FLIGHT", "HOTEL", "CAR"] });
  }
  assert.equal(searches[0].args.where.createdAt.gte.toISOString(), "2026-11-04T13:30:00.000Z");
  assert.equal(searches[0].args.where.createdAt.lt.toISOString(), "2026-11-04T13:45:00.000Z");
  assert.equal(searches[1].args.where.createdAt.gte.toISOString(), "2026-11-04T13:45:00.000Z");
  assert.equal(searches[1].args.where.createdAt.lte.toISOString(), now.toISOString());
  assert.deepEqual(calls.find(c => c.operation === "transaction")!.args, { isolationLevel: "RepeatableRead" });
  assert.equal(calls.find(c => c.operation === "flags")!.args.where.environment, "STAGING");
  assert.equal(result.searches![0].enabled, false);
  assert.equal(result.searches![1].enabled, true, "registry default is used only for an absent row after a successful read");
});
test("support includes only explicitly urgent, team-actionable records", async () => {
  const { db, calls } = database();
  const result = await readExpandedAdminAlertSignals(db as unknown as ExpandedAlertDatabase, "production", now);
  const args = calls.find(c => c.operation === "support")!.args;
  assert.equal(args.where.priority, "URGENT");
  assert.deepEqual(args.where.status, { in: ["OPEN", "WAITING_ON_TEAM"] });
  assert.equal(result.support!.OPEN.count, 2);
  assert.equal(result.support!.WAITING_ON_TEAM.count, 0);
});
test("security aggregation excludes routine users, suspended accounts, re-enabled MFA and old/future disablement", async () => {
  const { db, calls } = database();
  await readExpandedAdminAlertSignals(db as unknown as ExpandedAlertDatabase, "production", now);
  const args = calls.find(c => c.operation === "users")!.args;
  assert.deepEqual(args.where.user, { role: "ADMIN", status: "ACTIVE" });
  assert.equal(args.where.twoFactorEnabled, false);
  assert.equal(args.where.twoFactorDisabledAt.gte.toISOString(), "2026-11-03T14:00:00.000Z");
  assert.equal(args.where.twoFactorDisabledAt.lte.toISOString(), now.toISOString());
  assert.deepEqual(args._max, { twoFactorDisabledAt: true });
});
test("source failure and absent database return unknown, never fabricated healthy zeroes", async () => {
  const { db, tx } = database();
  tx.searchHistory.groupBy = async () => { throw new Error("private database failure"); };
  const result = await readExpandedAdminAlertSignals(db as unknown as ExpandedAlertDatabase, "staging", now);
  assert.equal(result.searches, null);
  assert.equal(result.support!.OPEN.count, 2);
  assert.equal(result.users!.count, 0);
  assert.doesNotMatch(JSON.stringify(result), /private database failure/);
  const unavailable = await readExpandedAdminAlertSignals(null, "staging", now);
  assert.equal(unavailable.searches, null); assert.equal(unavailable.support, null); assert.equal(unavailable.users, null);
});
test("unknown statuses and invalid aggregate counts do not silently vanish", async () => {
  const { db, tx } = database();
  tx.searchHistory.groupBy = async () => [{ type: "FLIGHT", status: "INVALID", _count: { _all: 2 }, _max: { createdAt: now } }] as any;
  assert.equal((await readExpandedAdminAlertSignals(db as unknown as ExpandedAlertDatabase, "staging", now)).searches, null);
  tx.searchHistory.groupBy = async () => [{ type: "FLIGHT", status: "FAILED", _count: { _all: -1 }, _max: { createdAt: now } }] as any;
  assert.equal((await readExpandedAdminAlertSignals(db as unknown as ExpandedAlertDatabase, "staging", now)).searches, null);
});
test("success and partial groups count in attempts, but only FAILED counts in the failure numerator", async () => {
  const { db, tx } = database();
  tx.searchHistory.groupBy = async () => ["SUCCESS", "PARTIAL", "FAILED"].map(status => ({ type: "HOTEL", status, _count: { _all: 10 }, _max: { createdAt: new Date("2026-11-04T13:40:00Z") } })) as any;
  const result = await readExpandedAdminAlertSignals(db as unknown as ExpandedAlertDatabase, "staging", now);
  assert.equal(result.searches![1].previous.total, 30);
  assert.equal(result.searches![1].previous.failed, 10);
  assert.equal(result.searches![1].previous.latestFailureAt, "2026-11-04T13:40:00.000Z");
  assert.doesNotMatch(JSON.stringify(result), /userId|password|email|secret|subject|metadata/);
});
