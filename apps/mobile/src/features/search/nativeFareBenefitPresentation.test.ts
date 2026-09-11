import assert from "node:assert/strict";
import test from "node:test";
import { compactFareTerms } from "../../../../../src/lib/flights/flightDetailsPresentation";
import type { FlightFareTerm } from "../../../../../src/lib/types";
import { nativeFareBenefitPresentation as present } from "./nativeFareBenefitPresentation";

const cases: Array<[FlightFareTerm["category"], string, string, string]> = [
  ["baggage", "1 carry-on included", "Carry-on baggage", "1 included"],
  ["baggage", "2 checked bags included", "Checked baggage", "2 included"],
  ["baggage", "1 carry-on included each way", "Carry-on baggage", "1 included each way"],
  ["change", "Changes allowed with USD 20.00 penalty", "Changes", "Allowed · USD 20.00 penalty"],
  ["change", "Changes allowed before departure", "Changes", "Allowed before departure"],
  ["change", "Changes not allowed before departure", "Changes", "Not allowed before departure"],
  ["refund", "Refundable before departure", "Refunds", "Refundable before departure"],
  ["refund", "Refundable before departure with USD 20.00 penalty", "Refunds", "Refundable before departure · USD 20.00 penalty"],
  ["refund", "Not refundable before departure", "Refunds", "Not refundable before departure"],
  ["fare", "Change and refund rules not supplied by the provider", "Change/refund rules", "Not supplied by provider"],
  ["baggage", "Baggage details not supplied by the provider", "Baggage details", "Not supplied by provider"],
  ["baggage", "Outbound: baggage allowance not supplied for one or more passengers", "Outbound: Baggage allowance", "Not supplied for one or more passengers"],
  ["fare", "No additional comparable fare benefits were supplied by the provider.", "Fare benefits", "No additional comparable benefits supplied by provider"],
];

test("every native fare benefit has a concise scoped title and authoritative detail", () => {
  for (const [category, source, title, detail] of cases) assert.deepEqual(present(category, source), { title, detail });
  assert.deepEqual(present("change", "Flight 1: Changes allowed"), { title: "Flight 1: Changes", detail: "Allowed" });
  assert.deepEqual(present("refund", "Flight 2: Not refundable"), { title: "Flight 2: Refunds", detail: "Not refundable" });
});

test("native can request five rows while the shared web default remains three", () => {
  const terms: FlightFareTerm[] = [
    { category: "baggage", semantic: "positive", text: "1 carry-on included" },
    { category: "baggage", semantic: "positive", text: "2 checked bags included" },
    { category: "change", semantic: "positive", text: "Changes allowed" },
    { category: "refund", semantic: "positive", text: "Refundable before departure" },
    { category: "fare", semantic: "informational", text: "No additional comparable fare benefits were supplied by the provider." },
  ];
  assert.equal(compactFareTerms(terms, "one-way").length, 3);
  assert.equal(compactFareTerms(terms, "one-way", 5).length, 5);
});
