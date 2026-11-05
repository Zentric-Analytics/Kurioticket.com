import assert from "node:assert/strict";
import test from "node:test";
import { loadIsolatedModule } from "../test-support/loadIsolatedModule";
import { featureControlRegistry } from "../lib/feature-controls/registry";
import * as alertCore from "./adminExpandedAlertCore";
import type * as implementation from "./adminExpandedAlertReader";

const now = new Date("2026-11-04T14:00:00.000Z");
type SearchArgs = { by: string[]; where: { query: { path: string[]; equals: string }; type: { in: string[] }; createdAt: { gte: Date; lt?: Date; lte?: Date } } };
type Group = { type: string; status: string; _count: { _all: number }; _max: { createdAt: Date } };
type Queries = {
  search: SearchArgs;
  flags: { where: { environment: string } };
  transaction: { isolationLevel: string };
  support: { where: { priority: string; status: { in: string[] } } };
  users: { where: { user: { role: string; status: string }; twoFactorEnabled: boolean; twoFactorDisabledAt: { gte: Date; lte: Date } }; _max: { twoFactorDisabledAt: boolean } };
};
type Call = { [K in keyof Queries]: { operation: K; args: Queries[K] } }[keyof Queries];
function database() {
  const calls: Call[] = [];
  const tx = {
    searchHistory: { groupBy: async (args: SearchArgs): Promise<Group[]> => { calls.push({ operation: "search", args }); return []; } },
    featureFlag: { findMany: async (args: Queries["flags"]) => { calls.push({ operation: "flags", args }); return [{ key: "FLIGHT_SEARCH_ENABLED", enabled: false }]; } },
  };
  const db = {
    $transaction: async <T>(run: (transaction: typeof tx) => Promise<T>, options: Queries["transaction"]) => { calls.push({ operation: "transaction", args: options }); return run(tx); },
    supportTicket: { groupBy: async (args: Queries["support"]) => { calls.push({ operation: "support", args }); return [{ status: "OPEN", _count: { _all: 2 }, _max: { updatedAt: new Date("2026-11-04T13:00:00Z") } }]; } },
    userSecuritySettings: { aggregate: async (args: Queries["users"]) => { calls.push({ operation: "users", args }); return { _count: { _all: 0 }, _max: { twoFactorDisabledAt: null } }; } },
  };
  return { db, tx, calls };
}
const { readExpandedAdminAlertSignals } = loadIsolatedModule<{
  readExpandedAdminAlertSignals: (db: ReturnType<typeof database>["db"] | null, environment: "staging" | "production", now?: Date) => ReturnType<typeof implementation.readExpandedAdminAlertSignals>;
}>("src/services/adminExpandedAlertReader.ts", { "../lib/feature-controls/registry": { featureControlRegistry }, "./adminExpandedAlertCore": alertCore });
test("search reads use exact environment, adjacent bounded windows, and authoritative feature controls", async () => {
  const { db, calls } = database();
  const result = await readExpandedAdminAlertSignals(db, "staging", now);
  assert.equal(result.environment, "staging");
  const searches = calls.filter(c => c.operation === "search");
  assert.equal(searches.length, 2);
  for (const { args } of searches) {
    assert.deepEqual(args.where.query, { path: ["environment"], equals: "staging" });
    assert.deepEqual(args.by, ["type", "status"]);
    assert.deepEqual(args.where.type, { in: ["FLIGHT", "HOTEL", "CAR"] });
  }
  assert.equal(searches[0].args.where.createdAt.gte.toISOString(), "2026-11-04T13:30:00.000Z");
  assert.equal(searches[0].args.where.createdAt.lt!.toISOString(), "2026-11-04T13:45:00.000Z");
  assert.equal(searches[1].args.where.createdAt.gte.toISOString(), "2026-11-04T13:45:00.000Z");
  assert.equal(searches[1].args.where.createdAt.lte!.toISOString(), now.toISOString());
  assert.deepEqual(calls.find(c => c.operation === "transaction")!.args, { isolationLevel: "RepeatableRead" });
  assert.equal(calls.find(c => c.operation === "flags")!.args.where.environment, "STAGING");
  assert.equal(result.searches![0].enabled, false);
  assert.equal(result.searches![1].enabled, true, "registry default is used only for an absent row after a successful read");
});
test("support includes only explicitly urgent, team-actionable records", async () => {
  const { db, calls } = database();
  const result = await readExpandedAdminAlertSignals(db, "production", now);
  const args = calls.find(c => c.operation === "support")!.args;
  assert.equal(args.where.priority, "URGENT");
  assert.deepEqual(args.where.status, { in: ["OPEN", "WAITING_ON_TEAM"] });
  assert.equal(result.support!.OPEN.count, 2);
  assert.equal(result.support!.WAITING_ON_TEAM.count, 0);
});
test("security aggregation excludes routine users, suspended accounts, re-enabled MFA and old/future disablement", async () => {
  const { db, calls } = database();
  await readExpandedAdminAlertSignals(db, "production", now);
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
  const result = await readExpandedAdminAlertSignals(db, "staging", now);
  assert.equal(result.searches, null);
  assert.equal(result.support!.OPEN.count, 2);
  assert.equal(result.users!.count, 0);
  assert.doesNotMatch(JSON.stringify(result), /private database failure/);
  const unavailable = await readExpandedAdminAlertSignals(null, "staging", now);
  assert.equal(unavailable.searches, null); assert.equal(unavailable.support, null); assert.equal(unavailable.users, null);
});
test("unknown statuses and invalid aggregate counts do not silently vanish", async () => {
  const { db, tx } = database();
  tx.searchHistory.groupBy = async () => [{ type: "FLIGHT", status: "INVALID", _count: { _all: 2 }, _max: { createdAt: now } }];
  assert.equal((await readExpandedAdminAlertSignals(db, "staging", now)).searches, null);
  tx.searchHistory.groupBy = async () => [{ type: "FLIGHT", status: "FAILED", _count: { _all: -1 }, _max: { createdAt: now } }];
  assert.equal((await readExpandedAdminAlertSignals(db, "staging", now)).searches, null);
});
test("success and partial groups count in attempts, but only FAILED counts in the failure numerator", async () => {
  const { db, tx } = database();
  tx.searchHistory.groupBy = async () => ["SUCCESS", "PARTIAL", "FAILED"].map(status => ({ type: "HOTEL", status, _count: { _all: 10 }, _max: { createdAt: new Date("2026-11-04T13:40:00Z") } }));
  const result = await readExpandedAdminAlertSignals(db, "staging", now);
  assert.equal(result.searches![1].previous.total, 30);
  assert.equal(result.searches![1].previous.failed, 10);
  assert.equal(result.searches![1].previous.latestFailureAt, "2026-11-04T13:40:00.000Z");
  assert.doesNotMatch(JSON.stringify(result), /userId|password|email|secret|subject|metadata/);
});
