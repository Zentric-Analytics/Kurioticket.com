import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCatalogReviewReport, canTransitionCatalogCandidate, deterministicCandidateId, validateCatalogReviewManifest, type CatalogReviewManifest } from "./catalogReview";
import type { CanonicalLocation } from "./types";

const location: CanonicalLocation = {
  id: "city:ng:lagos", kind: "city", primaryLabel: "Lagos", supportingLabel: "Lagos, Nigeria",
  submittedValue: "Lagos", country: { code: "NG", name: "Nigeria" }, aliases: ["Èkó"],
  staticCoverage: { flights: "reference-only", hotels: "exact", cars: "exact", packages: "exact" },
  source: { catalog: "kurioticket", datasetVersion: "fixture-v1" },
};

const manifest = (status: CatalogReviewManifest["candidates"][number]["status"] = "approved"): CatalogReviewManifest => ({
  schemaVersion: 1,
  reviewId: "lagos-review-2026-08",
  catalogVersion: "candidate-2026-08",
  candidates: [{
    id: deterministicCandidateId(location), location, status, requestedProducts: ["cars", "hotels", "cars"],
    evidenceReferences: status === "approved" ? ["manifest:ourairports-2026-08"] : [],
    decisionReason: ["rejected", "rolled-back"].includes(status) ? "Authoritative evidence did not support promotion." : undefined,
  }],
});

test("candidate IDs are deterministic across equivalent normalized identities", () => {
  assert.equal(deterministicCandidateId(location), deterministicCandidateId({ kind: "city", submittedValue: "  LAGOS  " }));
  assert.notEqual(deterministicCandidateId(location), deterministicCandidateId({ kind: "airport", submittedValue: "Lagos" }));
});

test("lifecycle prevents bypassing approval and supports rollback", () => {
  assert.equal(canTransitionCatalogCandidate("proposed", "promoted"), false);
  assert.equal(canTransitionCatalogCandidate("proposed", "approved"), true);
  assert.equal(canTransitionCatalogCandidate("approved", "promoted"), true);
  assert.equal(canTransitionCatalogCandidate("promoted", "rolled-back"), true);
});

test("review manifests enforce deterministic identities, evidence and decision reasons", () => {
  assert.deepEqual(validateCatalogReviewManifest(manifest()), []);
  const invalid = manifest("approved");
  const candidate = { ...invalid.candidates[0], id: "candidate:wrong", evidenceReferences: [] };
  const errors = validateCatalogReviewManifest({ ...invalid, candidates: [candidate, candidate] });
  assert.ok(errors.some((error) => error.includes("non-deterministic")));
  assert.ok(errors.some((error) => error.includes("duplicate")));
  assert.ok(errors.some((error) => error.includes("requires evidence")));
  assert.ok(validateCatalogReviewManifest(manifest("rejected")).length === 0);
});

test("review reports are deterministic, dedupe product counts and never claim availability", () => {
  assert.deepEqual(buildCatalogReviewReport(manifest()), {
    schemaVersion: 1,
    reviewId: "lagos-review-2026-08",
    catalogVersion: "candidate-2026-08",
    candidateCount: 1,
    byStatus: { proposed: 0, "needs-evidence": 0, approved: 1, rejected: 0, promoted: 0, "rolled-back": 0 },
    byKind: { airport: 0, city: 1, district: 0, landmark: 0, "rental-area": 0, custom: 0 },
    byProduct: { flights: 0, hotels: 1, cars: 1, packages: 0 },
    validationErrors: [],
    promotableCandidateIds: [deterministicCandidateId(location)],
    availabilityClaimed: false,
  });
});

test("review helpers never mutate canonical submitted values or URL contracts", () => {
  const before = new URLSearchParams({ destination: location.submittedValue }).toString();
  buildCatalogReviewReport(manifest());
  assert.equal(new URLSearchParams({ destination: location.submittedValue }).toString(), before);
  assert.equal(location.submittedValue, "Lagos");
});

test("the committed example review manifest remains valid", async () => {
  const path = new URL("../../../config/location-catalog/review-manifest.example.json", import.meta.url);
  const example = JSON.parse(await readFile(path, "utf8")) as CatalogReviewManifest;
  assert.deepEqual(validateCatalogReviewManifest(example), []);
  assert.equal(buildCatalogReviewReport(example).availabilityClaimed, false);
});
