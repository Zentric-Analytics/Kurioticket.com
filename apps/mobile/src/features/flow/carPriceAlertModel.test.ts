import assert from "node:assert/strict";
import test from "node:test";
import type { MobilePriceAlert } from "../../api/travelApi";
import { buildCarPriceAlertPayload, carAlertPresentation, matchingCarPriceAlert } from "./carPriceAlertModel";
import type { SearchPlan } from "./travelSearchModel";

const plan: SearchPlan = { key: "car:paris", summary: "Paris · 2030-01-01", payload: { pickupLocation: "Paris", dropoffLocation: "Paris", pickupDate: "2030-01-01", pickupTime: "10:00", dropoffDate: "2030-01-03", dropoffTime: "10:00", driverAge: "18-70" } };
const alert = (status: MobilePriceAlert["status"], query = plan.payload): MobilePriceAlert => ({ id: status, type: "CAR", origin: "Paris", destination: "Paris", targetPrice: "100", currency: "USD", status, createdAt: "", updatedAt: "", lastSeenPrice: null, lastCheckedAt: null, query });

test("builds a complete canonical car alert payload and normalizes currency", () => { assert.deepEqual(buildCarPriceAlertPayload(plan, 100, " usd "), { type: "CAR", origin: "Paris", destination: "Paris", targetPrice: 100, mode: "TARGET", currency: "USD", query: plan.payload }); });
test("only presents comparable supported-currency total offers", () => { const result = { offers: [{ totalPrice: 90, currency: "USD" }, { totalPrice: 0, currency: "USD" }, { totalPrice: 80, currency: "ZZZ" }] } as never; assert.deepEqual(carAlertPresentation(plan, [result]).currencies, ["USD"]); });
test("prefers active and retains paused matching alerts", () => { assert.equal(matchingCarPriceAlert([alert("PAUSED"), alert("ACTIVE")], plan)?.status, "ACTIVE"); assert.equal(matchingCarPriceAlert([alert("PAUSED")], plan)?.status, "PAUSED"); });
test("does not match an incomplete or different rental identity", () => { assert.equal(matchingCarPriceAlert([alert("ACTIVE", { ...plan.payload, pickupTime: "11:00" })], plan), undefined); });
