import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { COHORT_CHUNK_BYTES, encodeCohort, decodeCohort, isCohortManifest } from "./cohortEncoding";

test("cohorts round trip every offer and Unicode through bounded chunks", async () => {
  const offers = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: "東京 🏨", details: randomBytes(512).toString("base64") }));
  const { manifest, chunks } = await encodeCohort(offers, randomUUID());
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(c => Buffer.from(c, "base64").length <= COHORT_CHUNK_BYTES));
  assert.deepEqual(await decodeCohort(manifest, chunks), offers);
  await assert.rejects(decodeCohort(manifest, chunks.slice(1)));
  await assert.rejects(decodeCohort({ ...manifest, sha256: "0".repeat(64) }, chunks));
  await assert.rejects(decodeCohort({ ...manifest, rawBytes: 1 }, chunks));
  await assert.rejects(decodeCohort(manifest, ["!invalid", ...chunks.slice(1)]));
});

test("manifest validation rejects unsafe sizes, generations and formats", () => {
  for (const input of [null, [], {}, { format: "gzip-chunks-v1", generation: "../other", chunks: 999999 }]) {
    assert.equal(isCohortManifest(input), false);
  }
});
