import assert from "node:assert/strict";
import test from "node:test";
import { getCarRateDisclosureSections, getCarRatePaymentLabel } from "./carRateDisclosure";

test("rate sheet groups every supplied provider fact without changing its source data", () => {
  const facts = [
    { label: "payment Type", value: "payAtPickup" },
    { label: "fees 1 · code", value: "securityDeposit" },
    { label: "policy · fuel · code", value: "fullToFull" },
    { label: "Pickup · address", value: "9750 Airport Boulevard" },
    { label: "Drop-off · address", value: "9750 Airport Boulevard" },
    { label: "is Credit Card Required", value: "Yes" },
    { label: "doors", value: "doors45" },
    { label: "futureField", value: "future-enum" },
  ];
  const snapshot = structuredClone(facts);
  const sections = getCarRateDisclosureSections({ suppliedFacts: facts });
  assert.deepEqual(sections.map(section => section.id), ["payment", "policies", "pickup", "vehicle", "other"]);
  assert.equal(sections.reduce((sum, section) => sum + section.facts.length, 0), facts.length);
  assert.ok(sections.find(section => section.id === "payment")?.facts.some(fact => fact.value === "Pay at pickup"));
  assert.ok(sections.find(section => section.id === "vehicle")?.facts.some(fact => fact.value === "4 or 5 doors"));
  assert.ok(sections.find(section => section.id === "other")?.facts.some(fact => fact.value === "future-enum"));
  assert.deepEqual(facts, snapshot);
});

test("missing supplier facts stay unknown rather than becoming implied rental entitlements", () => {
  assert.deepEqual(getCarRateDisclosureSections({}), []);
  assert.equal(getCarRatePaymentLabel({ suppliedFacts: [], payAtPickup: false }), null);
  assert.equal(getCarRatePaymentLabel({ suppliedFacts: [], payAtPickup: true }), "Pay at pickup");
  assert.equal(getCarRatePaymentLabel({ suppliedFacts: [{ label: "payment Type", value: "deposit" }], payAtPickup: false }), "Deposit payment");
  assert.equal(getCarRatePaymentLabel({ suppliedFacts: [{ label: "payment Type", value: "unknown" }], payAtPickup: false }), null);
});
