import assert from "node:assert/strict";
import test from "node:test";
import type { CanonicalLocation, TravelProduct } from "./types";
import { resolveStaticSearch } from "./staticRecovery";

const location = (product: TravelProduct, level: "exact" | "broader" | "reference-only" | "none"): CanonicalLocation => ({
  id: "test:lagos", kind: "city", primaryLabel: "Lagos", supportingLabel: "Nigeria", submittedValue: "Lagos",
  staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none", [product]: level },
  source: { catalog: "kurioticket", datasetVersion: "test" },
});

test("static truth distinguishes exact and deterministic broader coverage", () => {
  assert.equal(resolveStaticSearch({ product: "hotels", location: location("hotels", "exact"), allowUnverifiedText: true }).kind, "exact");
  const broader = resolveStaticSearch({ product: "packages", location: location("packages", "broader"), allowUnverifiedText: false });
  assert.equal(broader.kind, "broader");
  assert.match(broader.message, /clearly labelled/);
});

test("permissive cars remain explicitly unverified and never imply inventory", () => {
  const result = resolveStaticSearch({ product: "cars", typedValue: "Xylophone Base 47", allowUnverifiedText: true });
  assert.deepEqual(result, { kind: "unverified", canSubmit: true, coverage: "unverified", message: "You can continue with this typed location. It is not provider-verified and static results may be unavailable." });
});

test("unsupported hotel text is blocked with deterministic recovery while flights retain external discovery", () => {
  assert.equal(resolveStaticSearch({ product: "hotels", typedValue: "Unknown", allowUnverifiedText: false }).kind, "unsupported");
  const flight = resolveStaticSearch({ product: "flights", location: location("flights", "reference-only"), allowUnverifiedText: false });
  assert.equal(flight.kind, "unsupported");
  assert.doesNotMatch(flight.message, /availability|inventory/i);
});
