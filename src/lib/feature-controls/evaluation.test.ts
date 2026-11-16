import assert from "node:assert/strict";
import test from "node:test";
import { createFeatureControlEvaluator } from "./evaluation";
import { featureControlKeys } from "./registry";

test("unknown persistence never enables a cold instance, for every control", async () => {
  for (const read of [async () => null, async (): Promise<boolean> => { throw new Error("offline"); }]) {
    const evaluator = createFeatureControlEvaluator(read);
    for (const key of featureControlKeys) assert.equal(await evaluator.evaluate(key, "PRODUCTION"), false);
  }
});
test("shutdown survives cache expiry, repeated outages and instance restart", async () => {
  let time = 0; let offline = false;
  const read = async () => { if (offline) throw new Error("offline"); return false; };
  const instance = createFeatureControlEvaluator(read, () => time);
  assert.equal(await instance.evaluate("FLIGHT_SEARCH_ENABLED", "PRODUCTION"), false);
  offline = true; time = 100_000;
  assert.equal(await instance.evaluate("FLIGHT_SEARCH_ENABLED", "PRODUCTION"), false);
  assert.equal(await createFeatureControlEvaluator(read).evaluate("FLIGHT_SEARCH_ENABLED", "PRODUCTION"), false);
});
test("critical enabled state expires while noncritical transient availability is bounded", async () => {
  let time = 0; let offline = false;
  const evaluator = createFeatureControlEvaluator(async () => { if (offline) throw new Error(); return true; }, () => time);
  for (const key of featureControlKeys) await evaluator.evaluate(key, "STAGING");
  offline = true; time = 10_001;
  assert.equal(await evaluator.evaluate("FLIGHT_SEARCH_ENABLED", "STAGING"), false);
  assert.equal(await evaluator.evaluate("PRICE_ALERT_PROCESSING_ENABLED", "STAGING"), false);
  assert.equal(await evaluator.evaluate("HOTEL_SEARCH_ENABLED", "STAGING"), true);
  assert.equal(await evaluator.evaluate("DEALS_ENABLED", "STAGING"), true);
  time = 60_001;
  assert.equal(await evaluator.evaluate("HOTEL_SEARCH_ENABLED", "STAGING"), false);
  time = 300_001;
  assert.equal(await evaluator.evaluate("DEALS_ENABLED", "STAGING"), false);
});
test("environment caches remain independent and recovery reads authoritative state", async () => {
  let time = 0; let enabled = true;
  const evaluator = createFeatureControlEvaluator(async (_key, env) => env === "STAGING" && enabled, () => time);
  assert.equal(await evaluator.evaluate("CAR_SEARCH_ENABLED", "STAGING"), true);
  assert.equal(await evaluator.evaluate("CAR_SEARCH_ENABLED", "PRODUCTION"), false);
  time = 10_001; enabled = false;
  assert.equal(await evaluator.evaluate("CAR_SEARCH_ENABLED", "STAGING"), false);
});
test("multiple instances converge after TTL without a shared process cache", async () => {
  let time = 0; let enabled = true;
  const read = async () => enabled;
  const a = createFeatureControlEvaluator(read, () => time), b = createFeatureControlEvaluator(read, () => time);
  await a.evaluate("FLIGHT_SEARCH_ENABLED", "PRODUCTION"); await b.evaluate("FLIGHT_SEARCH_ENABLED", "PRODUCTION");
  enabled = false; a.remember("FLIGHT_SEARCH_ENABLED", "PRODUCTION", false);
  assert.equal(await a.evaluate("FLIGHT_SEARCH_ENABLED", "PRODUCTION"), false);
  time = 10_001;
  assert.equal(await b.evaluate("FLIGHT_SEARCH_ENABLED", "PRODUCTION"), false);
});
test("an in-flight old read cannot undo a committed shutdown or cache reset", async () => {
  let release!: (value: boolean) => void;
  const evaluator = createFeatureControlEvaluator(() => new Promise(resolve => { release = resolve; }));
  const pending = evaluator.evaluate("FLIGHT_SEARCH_ENABLED", "PRODUCTION");
  evaluator.remember("FLIGHT_SEARCH_ENABLED", "PRODUCTION", false); release(true);
  assert.equal(await pending, false);
  evaluator.invalidate("FLIGHT_SEARCH_ENABLED", "PRODUCTION");
  const next = evaluator.evaluate("FLIGHT_SEARCH_ENABLED", "PRODUCTION");
  evaluator.clear(); release(true); assert.equal(await next, false);
});
