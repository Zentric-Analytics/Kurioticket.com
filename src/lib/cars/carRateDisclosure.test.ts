import assert from "node:assert/strict";
import test from "node:test";
import { getCarRateDisclosureSections, getCarRatePaymentLabel } from "./carRateDisclosure";

type Sections = ReturnType<typeof getCarRateDisclosureSections>;
const row = (sections: Sections, id: string, label: string) =>
  sections.find(section => section.id === id)?.facts.find(fact => fact.label === label)?.value;

test("Cars disclosures have customer-facing order, labels, and no mutation or leaked raw codes", () => {
  const suppliedFacts = [
    { label: "payment Type", value: "payAtPickup" },
    { label: "fees 1 · code", value: "securityDeposit" },
    { label: "fees 1 · rate · displayPrice", value: "$150.00" },
    { label: "fees 1 · is Included In Total", value: "No" },
    { label: "policy · fuel · code", value: "fullToFull" },
    { label: "policy · fuel · display Name", value: "full-to-full" },
    { label: "policy · fuel · description", value: "Return with a full tank" },
    { label: "fuel", value: "petrol" },
    { label: "Rental agency · display Name", value: "Budget" },
    { label: "Pickup · address", value: "9750 Airport Boulevard" },
    { label: "Drop-off · address", value: "Return street" },
    { label: "Pickup · location Type", value: "shuttle" },
    { label: "is Credit Card Required", value: "Yes" },
    { label: "type · display Name", value: "Supplier choice" },
    { label: "passengers", value: "5" },
    { label: "doors", value: "doors45" },
    { label: "features 1 · display Name", value: "Air conditioning" },
    { label: "sipp", value: "XXAR" },
    { label: "rate Type", value: "bestAvailable" },
    { label: "fees 2 · code", value: "futureFee" },
    { label: "futureField", value: "future-enum" },
  ];
  const unchanged = structuredClone(suppliedFacts);
  const sections = getCarRateDisclosureSections({ suppliedFacts, currency: "USD" });
  assert.deepEqual(sections.map(section => section.id), ["payment", "policies", "pickup", "driver", "vehicle"]);
  assert.equal(row(sections, "payment", "Security deposit"), "$150.00 USD · Not included in estimated total");
  assert.equal(row(sections, "policies", "Fuel return policy"), "Full to full");
  assert.equal(row(sections, "pickup", "Rental agency"), "Budget");
  assert.equal(row(sections, "pickup", "Return location"), "Return street");
  assert.equal(row(sections, "pickup", "Pickup method"), "Shuttle pickup");
  assert.equal(row(sections, "driver", "Credit card required"), "Yes");
  assert.equal(row(sections, "vehicle", "Doors"), "4 or 5");
  assert.equal(row(sections, "vehicle", "Fuel type"), "Petrol");
  assert.equal(row(sections, "vehicle", "Features"), "Air conditioning");
  assert.equal(getCarRatePaymentLabel({ suppliedFacts, payAtPickup: false }), "Pay at pickup");
  assert.doesNotMatch(JSON.stringify(sections), /futureField|futureFee|XXAR|bestAvailable|fees 1|full-to-full|Return with a full tank/);
  assert.deepEqual(suppliedFacts, unchanged);
});

test("cancellation badge with conditional terms never becomes an unconditional promise", () => {
  const suppliedFacts = [
    { label: "policy · cancellation · is Unlimited", value: "No" },
    { label: "policy · cancellation · limit Hours", value: "48" },
    { label: "policy · cancellation · non Cancellation Fee · price", value: "44" },
    { label: "policy · cancellation · non Cancellation Fee · display Price", value: "$44.0" },
    { label: "badges 1 · code", value: "freeCancellation" },
    { label: "badges 1 · display Name", value: "Free Cancellation" },
  ];
  const sections = getCarRateDisclosureSections({ suppliedFacts, currency: "USD" });
  assert.equal(row(sections, "policies", "Cancellation"), "Free cancellation advertised; conditions and fees may apply");
  assert.equal(row(sections, "policies", "Provider-listed policy fee"), "$44.0 USD · Check when it applies");
  assert.doesNotMatch(JSON.stringify(sections), /limit Hours|48 hours|is Unlimited|freeCancellation/);
  assert.equal(row(getCarRateDisclosureSections({
    suppliedFacts: [{ label: "badges 1 · code", value: "freeCancellation" }],
  }), "policies", "Cancellation"), "Free cancellation advertised; check provider conditions");
  assert.equal(row(getCarRateDisclosureSections({
    suppliedFacts: [
      { label: "policy · cancellation · is Unlimited", value: "Yes" },
      { label: "policy · cancellation · non Cancellation Fee · price", value: "11" },
    ],
    currency: "USD",
  }), "policies", "Cancellation"), "Check provider conditions");
});

test("missing prices, unknown enums and missing driver criteria must stay unknown", () => {
  assert.deepEqual(getCarRateDisclosureSections({}), []);
  const sections = getCarRateDisclosureSections({ suppliedFacts: [
    { label: "fees 2 · code", value: "securityDeposit" },
    { label: "policy · mileage · code", value: "limited" },
    { label: "is Credit Card Required", value: "No" },
    { label: "type · code", value: "special" },
    { label: "policy · fuel · code", value: "unrecognized" },
  ] });
  assert.equal(row(sections, "payment", "Security deposit"), "Amount not supplied");
  assert.equal(row(sections, "policies", "Mileage"), "Limited mileage; allowance not supplied");
  assert.equal(row(sections, "driver", "Credit card required"), "No");
  assert.equal(row(sections, "driver", "Minimum driver age"), undefined);
  assert.equal(sections.some(section => section.id === "vehicle"), false);
  assert.equal(getCarRatePaymentLabel({ suppliedFacts: [], payAtPickup: false }), null);
  assert.equal(getCarRatePaymentLabel({ suppliedFacts: [], payAtPickup: true }), "Pay at pickup");
  assert.equal(getCarRatePaymentLabel({ suppliedFacts: [{ label: "payment Type", value: "deposit" }], payAtPickup: false }), "Deposit payment");
  assert.equal(getCarRatePaymentLabel({ suppliedFacts: [{ label: "payment Type", value: "unknown" }], payAtPickup: false }), null);
});

test("fee amount is never reused across different fee codes or currencies", () => {
  const sections = getCarRateDisclosureSections({ currency: "USD", suppliedFacts: [
    { label: "fees 1 · code", value: "securityDeposit" },
    { label: "fees 1 · rate · price", value: "200" },
    { label: "fees 1 · is Included In Total", value: "Yes" },
    { label: "fees 2 · code", value: "youngDriver" },
  ] });
  assert.equal(row(sections, "payment", "Security deposit"), "$200.00 USD · Included in estimated total");
  assert.equal(row(sections, "payment", "Young-driver fee"), "Amount not supplied");
  const unknownCurrency = getCarRateDisclosureSections({
    suppliedFacts: [{ label: "fees 1 · code", value: "securityDeposit" }, { label: "fees 1 · rate · price", value: "200" }],
  });
  assert.equal(row(unknownCurrency, "payment", "Security deposit"), "Amount not supplied");
});
