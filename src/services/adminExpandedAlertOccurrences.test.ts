import assert from "node:assert/strict";
import test from "node:test";
import { persistExpandedAlertOccurrences, type OccurrenceDatabase } from "./adminExpandedAlertOccurrences";

const now = new Date("2026-11-04T14:00:00Z");
const alert = { key: "expanded.staging.support.OPEN", source: "SUPPORT", severity: "WARNING", title: "Urgent tickets", message: "2 urgent tickets", actionHref: "/admin/support?priority=URGENT&status=OPEN", signalToken: "provisional" } as const;
function database() {
  const rows: any[] = [];
  let locks = 0;
  const tx = {
    $executeRaw: async () => { locks++; },
    adminAuditLog: {
      findFirst: async (args: any) => rows.filter(row => row.targetId === args.where.targetId).at(-1) ?? null,
      create: async ({ data }: any) => { rows.push({ ...data, createdAt: now }); return data; },
    },
  };
  return { db: { $transaction: async (run: (tx: any) => Promise<any>) => run(tx) } as unknown as OccurrenceDatabase, rows, locks: () => locks };
}
test("polling and count changes retain acknowledgement identity for a continuous incident", async () => {
  const { db, rows, locks } = database();
  const first = await persistExpandedAlertOccurrences(db, "staging", [alert], { [alert.key]: true }, now);
  const second = await persistExpandedAlertOccurrences(db, "staging", [{ ...alert, message: "3 urgent tickets" }], { [alert.key]: true }, new Date(now.getTime() + 60_000));
  assert.equal(first[0].signalToken, second[0].signalToken); assert.equal(rows.length, 1); assert.equal(locks(), 2);
});
test("verified recovery and recurrence produce a new token; unknown telemetry does not clear the incident", async () => {
  const { db, rows } = database();
  const first = await persistExpandedAlertOccurrences(db, "staging", [alert], { [alert.key]: true }, now);
  await persistExpandedAlertOccurrences(db, "staging", [], {}, new Date(now.getTime() + 1_000));
  assert.equal(rows.length, 1);
  await persistExpandedAlertOccurrences(db, "staging", [], { [alert.key]: false }, new Date(now.getTime() + 2_000));
  assert.equal(rows.at(-1).metadata.state, "CLEAR");
  const next = await persistExpandedAlertOccurrences(db, "staging", [alert], { [alert.key]: true }, new Date(now.getTime() + 3_000));
  assert.notEqual(first[0].signalToken, next[0].signalToken);
});
test("critical escalation cannot be hidden by an earlier warning acknowledgement", async () => {
  const { db } = database();
  const first = await persistExpandedAlertOccurrences(db, "staging", [alert], { [alert.key]: true }, now);
  const next = await persistExpandedAlertOccurrences(db, "staging", [{ ...alert, severity: "CRITICAL" }], { [alert.key]: true }, now);
  assert.notEqual(first[0].signalToken, next[0].signalToken);
});
test("persistence failure preserves the incident and does not claim a durable acknowledgement token", async () => {
  const db = { $transaction: async () => { throw new Error("private diagnostic"); } } as unknown as OccurrenceDatabase;
  const result = await persistExpandedAlertOccurrences(db, "staging", [alert], { [alert.key]: true }, now);
  assert.equal(result.length, 1); assert.match(result[0].signalToken, /^unpersisted:/);
  assert.doesNotMatch(JSON.stringify(result), /private diagnostic/);
});
