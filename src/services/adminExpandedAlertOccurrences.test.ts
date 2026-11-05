import assert from "node:assert/strict";
import test from "node:test";
import * as crypto from "node:crypto";
import { loadIsolatedModule } from "../test-support/loadIsolatedModule";
import type * as implementation from "./adminExpandedAlertOccurrences";
import type { AdminAlertCandidate } from "./adminAlertCore";

const now = new Date("2026-11-04T14:00:00Z");
const alert = { key: "expanded.staging.support.OPEN", source: "SUPPORT", severity: "WARNING", title: "Urgent tickets", message: "2 urgent tickets", actionHref: "/admin/support?priority=URGENT&status=OPEN", signalToken: "provisional" } as const;
type AuditData = { targetId: string; metadata: { state: string; occurrenceToken?: string } };
function database() {
  const rows: Array<AuditData & { createdAt: Date }> = [];
  let locks = 0;
  const tx = {
    $executeRaw: async () => { locks++; },
    adminAuditLog: {
      findFirst: async (args: { where: { targetId: string } }) => rows.filter(row => row.targetId === args.where.targetId).at(-1) ?? null,
      create: async ({ data }: { data: AuditData }) => { rows.push({ ...data, createdAt: now }); return data; },
    },
  };
  return { db: { $transaction: async <T>(run: (transaction: typeof tx) => Promise<T>) => run(tx) }, rows, locks: () => locks };
}
const { persistExpandedAlertOccurrences } = loadIsolatedModule<{
  persistExpandedAlertOccurrences: (db: ReturnType<typeof database>["db"] | null, environment: "staging" | "production", candidates: readonly AdminAlertCandidate[], states: Record<string, boolean>, now?: Date) => ReturnType<typeof implementation.persistExpandedAlertOccurrences>;
}>("src/services/adminExpandedAlertOccurrences.ts", { "node:crypto": crypto });
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
  assert.equal(rows.at(-1)!.metadata.state, "CLEAR");
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
  const db = { $transaction: async () => { throw new Error("private diagnostic"); } };
  const result = await persistExpandedAlertOccurrences(db, "staging", [alert], { [alert.key]: true }, now);
  assert.equal(result.length, 1); assert.match(result[0].signalToken, /^unpersisted:/);
  assert.doesNotMatch(JSON.stringify(result), /private diagnostic/);
});
