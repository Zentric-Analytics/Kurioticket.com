import assert from "node:assert/strict";
import test from "node:test";
import { encodeCohort, decodeCohort } from "@/lib/search/cohortEncoding";
import { publishHotelCohortAliases } from "./publishHotelCohortAliases";
const generation = "00000000-0000-4000-8000-000000000001";
test("one immutable generation serves exact snapshot and criteria aliases with every rate intact", async () => {
  const rows = Array.from({ length: 10205 }, (_, i) => ({ id: i, property: i % 949, name: "Synthetic hotel" }));
  let encodes = 0; const publications: string[] = [];
  const generations: unknown[] = [];
  await publishHotelCohortAliases(rows, "criteria", () => "snapshot", async (key, received, encoded) => {
    publications.push(key); generations.push(encoded);
    assert.deepEqual(await decodeCohort(encoded.manifest, encoded.chunks), received);
  }, async received => { encodes++; return encodeCohort(received, generation); });
  assert.equal(encodes, 1); assert.deepEqual(publications, ["snapshot", "criteria"]);
  assert.equal(generations[0], generations[1]);
});
test("concurrent and mixed snapshots never reuse an incompatible cumulative payload", async () => {
  const rows = [{ id: 1, snapshot: "a" }, { id: 2, snapshot: "b" }];
  const publications = new Map<string, unknown[]>();
  await Promise.all(["first", "second"].map(owner => publishHotelCohortAliases(rows, owner, row => owner + row.snapshot, async (key, received, encoded) => {
    publications.set(key, await decodeCohort(encoded.manifest, encoded.chunks));
    assert.deepEqual(publications.get(key), received);
  })));
  assert.deepEqual(publications.get("firsta"), [rows[0]]); assert.deepEqual(publications.get("firstb"), [rows[1]]);
  assert.deepEqual(publications.get("second"), rows);
});
test("failed snapshot publication cannot claim complete criteria publication", async () => {
  const keys: string[] = [];
  await assert.rejects(publishHotelCohortAliases([{ id: 1 }], "criteria", () => "snapshot", async key => { keys.push(key); throw Error("publication failed"); }), /publication failed/);
  assert.deepEqual(keys, ["snapshot"]);
});
test("published aliases remain readable after losing all process-local objects", async () => {
  const rates = Array.from({ length: 500 }, (_, id) => ({ id, property: id % 50 }));
  const durable = new Map<string, string>();
  await publishHotelCohortAliases(rates, "criteria", () => "snapshot", async (key, _rows, encoded) => { durable.set(key, JSON.stringify(encoded)); });
  for (const serialized of durable.values()) {
    const restored = JSON.parse(serialized) as Awaited<ReturnType<typeof encodeCohort>>;
    assert.deepEqual(await decodeCohort(restored.manifest, restored.chunks), rates);
  }
});
