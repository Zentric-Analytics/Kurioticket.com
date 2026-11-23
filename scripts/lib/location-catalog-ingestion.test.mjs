import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildCoverageReport,
  normalizeOurAirports,
  parseCsv,
  selectRollbackSnapshot,
  sha256,
  validateManifest,
  verifySnapshot,
} from "./location-catalog-ingestion.mjs";

const fixtureUrl = new URL("../fixtures/location-catalog/ourairports-small.csv", import.meta.url);
const manifestUrl = new URL("../fixtures/location-catalog/ourairports-small.manifest.json", import.meta.url);
const csv = await readFile(fixtureUrl, "utf8");
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

test("snapshot manifest and checksum validate", () => {
  assert.deepEqual(validateManifest(manifest), []);
  assert.equal(verifySnapshot(csv, manifest), sha256(csv));
  assert.throws(() => verifySnapshot(`${csv}tampered`, manifest), /Checksum mismatch/);
});

test("malformed input and invalid manifests fail closed", () => {
  assert.throws(() => parseCsv('id,name\n1,"broken'), /unclosed quoted field/);
  assert.ok(validateManifest({ ...manifest, sourceUrl: "https://example.com/airports.csv" }).length);
  assert.ok(validateManifest({ ...manifest, sha256: "bad" }).length);
});

test("normalization is deterministic and excludes duplicates, closed and invalid codes", () => {
  const normalized = normalizeOurAirports(parseCsv(csv));
  assert.deepEqual(normalized.candidates.map((item) => item.code), ["LAX", "LHR", "MEX"]);
  assert.deepEqual(normalized.candidates.map((item) => item.id), ["airport:LAX", "airport:LHR", "airport:MEX"]);
  assert.deepEqual(normalized.ambiguous, [{ code: "DUP", sourceIds: ["5", "6"] }]);
  assert.ok(normalized.rejected.some((item) => item.iata === "ZZZ" && item.reasons.includes("unsupported-type")));
  assert.ok(normalized.rejected.some((item) => item.reasons.includes("invalid-iata")));
  assert.deepEqual(normalizeOurAirports(parseCsv(csv)), normalized);
});

test("coverage report is review-only and identifies missing, changed and ambiguous records", () => {
  const normalized = normalizeOurAirports(parseCsv(csv));
  const report = buildCoverageReport([{ code: "LAX", city: "Los Angeles", airport: "Old LAX Name", countryCode: "US", lat: 33, lon: -118 }, { code: "JFK", city: "New York", airport: "JFK", countryCode: "US", lat: 40, lon: -73 }], normalized);
  assert.deepEqual(report.missingFromCurrent, ["LHR", "MEX"]);
  assert.deepEqual(report.missingFromInput, ["JFK"]);
  assert.deepEqual(report.changed[0], { code: "LAX", fields: ["airport", "coordinates"] });
  assert.equal(report.ambiguous[0].code, "DUP");
  assert.equal(report.availabilityClaimed, false);
});

test("rollback chooses newest prior snapshot and retains a bounded last-known-good set", () => {
  const snapshots = [
    { ...manifest, version: "v1", retrievedAt: "2026-01-01T00:00:00Z" },
    { ...manifest, version: "v2", retrievedAt: "2026-02-01T00:00:00Z" },
    { ...manifest, version: "v3", retrievedAt: "2026-03-01T00:00:00Z" },
  ];
  const result = selectRollbackSnapshot(snapshots, "v3", 2);
  assert.equal(result.rollback.version, "v2");
  assert.deepEqual(result.retained.map((item) => item.version), ["v2", "v1"]);
});

test("CLI dry run emits review JSON without writing candidate output", () => {
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL("../location-catalog-ingest.mjs", import.meta.url)),
    "--manifest", fileURLToPath(manifestUrl),
    "--input", fileURLToPath(fixtureUrl),
    "--dry-run",
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.dryRun, true);
  assert.equal(output.report.availabilityClaimed, false);
  assert.equal(output.report.inputCandidateCount, 3);
  assert.equal("outDir" in output, false);
});
