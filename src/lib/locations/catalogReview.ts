import { createHash } from "node:crypto";
import { locationKinds, type CanonicalLocation, type LocationKind, type TravelProduct } from "./types";

export const catalogCandidateStatuses = ["proposed", "needs-evidence", "approved", "rejected", "promoted", "rolled-back"] as const;
export type CatalogCandidateStatus = (typeof catalogCandidateStatuses)[number];

export type CatalogCandidate = Readonly<{
  id: string;
  location: CanonicalLocation;
  status: CatalogCandidateStatus;
  requestedProducts: readonly TravelProduct[];
  evidenceReferences: readonly string[];
  decisionReason?: string;
}>;

export type CatalogReviewManifest = Readonly<{
  schemaVersion: 1;
  reviewId: string;
  catalogVersion: string;
  candidates: readonly CatalogCandidate[];
}>;

const transitions: Readonly<Record<CatalogCandidateStatus, readonly CatalogCandidateStatus[]>> = {
  proposed: ["needs-evidence", "approved", "rejected"],
  "needs-evidence": ["proposed", "approved", "rejected"],
  approved: ["promoted", "rejected"],
  rejected: ["proposed"],
  promoted: ["rolled-back"],
  "rolled-back": ["approved", "rejected"],
};

export function canTransitionCatalogCandidate(from: CatalogCandidateStatus, to: CatalogCandidateStatus) {
  return transitions[from].includes(to);
}
export function deterministicCandidateId(location: Pick<CanonicalLocation, "kind" | "submittedValue">) {
  const identity = `${location.kind}:${location.submittedValue.normalize("NFKC").trim().toLocaleLowerCase("en-US")}`;
  return `candidate:${createHash("sha256").update(identity).digest("hex").slice(0, 20)}`;
}

export function validateCatalogReviewManifest(manifest: CatalogReviewManifest) {
  const errors: string[] = [];
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(manifest.reviewId)) errors.push("reviewId must be a stable lowercase identifier");
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(manifest.catalogVersion)) errors.push("catalogVersion must be a stable lowercase identifier");
  const ids = new Set<string>();
  for (const candidate of manifest.candidates) {
    if (ids.has(candidate.id)) errors.push(`duplicate candidate id: ${candidate.id}`);
    ids.add(candidate.id);
    if (candidate.id !== deterministicCandidateId(candidate.location)) errors.push(`non-deterministic candidate id: ${candidate.id}`);
    if (!catalogCandidateStatuses.includes(candidate.status)) errors.push(`invalid status: ${candidate.status}`);
    if (!locationKinds.includes(candidate.location.kind as LocationKind)) errors.push(`invalid location kind: ${candidate.location.kind}`);
    if (!candidate.location.primaryLabel.trim() || !candidate.location.submittedValue.trim()) errors.push(`candidate ${candidate.id} requires primaryLabel and submittedValue`);
    if (candidate.status === "approved" && candidate.evidenceReferences.length === 0) errors.push(`approved candidate ${candidate.id} requires evidence`);
    if (["rejected", "rolled-back"].includes(candidate.status) && !candidate.decisionReason?.trim()) errors.push(`${candidate.status} candidate ${candidate.id} requires decisionReason`);
  }
  return errors.sort();
}

export function buildCatalogReviewReport(manifest: CatalogReviewManifest) {
  const byStatus = Object.fromEntries(catalogCandidateStatuses.map((status) => [status, 0])) as Record<CatalogCandidateStatus, number>;
  const byKind = Object.fromEntries(locationKinds.map((kind) => [kind, 0])) as Record<LocationKind, number>;
  const byProduct: Record<TravelProduct, number> = { flights: 0, hotels: 0, cars: 0, packages: 0 };
  for (const candidate of manifest.candidates) {
    byStatus[candidate.status] += 1;
    byKind[candidate.location.kind] += 1;
    for (const product of [...new Set(candidate.requestedProducts)].sort()) byProduct[product] += 1;
  }
  return Object.freeze({
    schemaVersion: 1,
    reviewId: manifest.reviewId,
    catalogVersion: manifest.catalogVersion,
    candidateCount: manifest.candidates.length,
    byStatus,
    byKind,
    byProduct,
    validationErrors: validateCatalogReviewManifest(manifest),
    promotableCandidateIds: manifest.candidates.filter((candidate) => candidate.status === "approved").map((candidate) => candidate.id).sort(),
    availabilityClaimed: false,
  });
}

