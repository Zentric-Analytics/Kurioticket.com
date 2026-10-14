import assert from "node:assert/strict";
import test from "node:test";
import { auditFingerprints, captureTemporarySupplierAudit, temporaryAuditAllowed } from "./temporarySupplierAudit";

test("temporary supplier capture is staging-only, date-scoped and automatically expires", () => {
  const search = { vertical: "flights" as const, origin: "SFO", destination: "LOS", departure: "2026-11-18", adults: 1 };
  const env = { NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com", TRAVEL_PROVIDER_MODE: "staging", KAYAK_SANDBOX_ENABLED: "true" };
  assert.equal(temporaryAuditAllowed(search, env, Date.parse("2026-10-13")), true);
  assert.equal(temporaryAuditAllowed(search, { ...env, TRAVEL_PROVIDER_MODE: "production" }, Date.parse("2026-10-13")), false);
  assert.equal(temporaryAuditAllowed(search, { ...env, NEXT_PUBLIC_APP_URL: "https://kurioticket.com" }, Date.parse("2026-10-13")), false);
  assert.equal(temporaryAuditAllowed(search, env, Date.parse("2026-10-14T06:00:00Z")), false);
  assert.equal(temporaryAuditAllowed({ ...search, departure: "2026-11-19" }, env, Date.parse("2026-10-13")), false);
});
test("capture excludes identifiers and credentials and fingerprints rather than emits supplier text", () => {
  const result = auditFingerprints({ id: "PRIVATE_ID", apiKey: "PRIVATE_KEY", token: "PRIVATE_TOKEN", email: "PRIVATE_EMAIL", bookingUrl: "https://private.invalid", passengers: [{ name: "PRIVATE_NAME" }], policies: ["Customer terms https://example.com"], price: 103.25, taxIncluded: false }, "raw");
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|https:\/\//);
  assert.equal(result.leaves.find(item => item.path === "raw.price")?.value, 103.25);
  assert.equal(result.leaves.find(item => item.path === "raw.taxIncluded")?.value, false);
  assert.ok(result.leaves.find(item => item.path === "raw.policies[]")?.fingerprint);
});
test("capture reports truncation instead of claiming complete coverage", () => {
  const result = auditFingerprints(Array.from({ length: 300 }, (_, i) => i), "raw");
  assert.equal(result.leaves.length, 240);
  assert.equal(result.bounded, true);
});
test("capture selects the matched option, excludes unrelated dictionaries and records once", (t) => {
  const saved = { url: process.env.NEXT_PUBLIC_APP_URL, mode: process.env.TRAVEL_PROVIDER_MODE, enabled: process.env.KAYAK_SANDBOX_ENABLED, info: console.info };
  t.after(() => {
    for (const [key, value] of Object.entries({ NEXT_PUBLIC_APP_URL: saved.url, TRAVEL_PROVIDER_MODE: saved.mode, KAYAK_SANDBOX_ENABLED: saved.enabled })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    console.info = saved.info;
  });
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  process.env.KAYAK_SANDBOX_ENABLED = "true";
  const output: string[] = [];
  console.info = (...args) => { output.push(args.join(" ")); };
  const search = { vertical: "cars" as const, origin: "BOS", departure: "2026-11-18", returnDate: "2026-11-21" };
  const sample = { id: "private-row:1", title: "Car", description: "Seller", details: [], price: 90, currency: "USD", priceBasis: "total", testUrl: "https://affiliates.kayak.com/sandbox-clickout" };
  const data = { results: [{ bookingOptions: [{ price: { price: 999 } }, { price: { price: 90 }, providerCode: "MATCH" }] }], providers: { MATCH: { displayName: "Seller" }, OTHER: { irrelevant: 777 } } };
  captureTemporarySupplierAudit(search, data, sample);
  const before = output.length;
  captureTemporarySupplierAudit(search, data, sample);
  assert.equal(output.length, before);
  assert.ok(before > 0);
  assert.doesNotMatch(output.join(""), /private-row|MATCH|OTHER|irrelevant|999|777/);
  assert.match(output.join(""), /raw\.result\.bookingOptions\[\]\.price\.price/);
});
