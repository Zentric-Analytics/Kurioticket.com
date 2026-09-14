import assert from "node:assert/strict";
import test from "node:test";
import { compactFareTerms } from "../../../../../src/lib/flights/flightDetailsPresentation";
import type { FlightFareTerm } from "../../../../../src/lib/types";
import { nativeFareBenefitPresentation as present, nativeFareBenefitRows } from "./nativeFareBenefitPresentation";

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

test("native groups authoritative facts into at most three rows without changing the shared web helper", () => {
  const terms: FlightFareTerm[] = [
    { category: "baggage", semantic: "positive", text: "1 carry-on included" },
    { category: "baggage", semantic: "positive", text: "2 checked bags included" },
    { category: "change", semantic: "positive", text: "Changes allowed" },
    { category: "refund", semantic: "positive", text: "Refundable before departure" },
    { category: "fare", semantic: "informational", text: "No additional comparable fare benefits were supplied by the provider." },
  ];
  assert.deepEqual(nativeFareBenefitRows(terms, "one-way").map(({ title }) => title), ["Carry-on baggage", "Checked baggage", "Change/refund rules"]);
  assert.equal(nativeFareBenefitRows(terms, "one-way").length, 3);
  assert.deepEqual(compactFareTerms(terms, "one-way").map(({ text }) => text), ["1 carry-on included", "2 checked bags included", "Changes allowed"]);
  assert.equal(compactFareTerms(terms, "one-way", 5).length, 5);
});

test("native keeps partial-passenger baggage warnings inside the three-row presentation", () => {
  const rows = nativeFareBenefitRows([
    { category: "baggage", semantic: "positive", text: "1 carry-on included" },
    { category: "baggage", semantic: "positive", text: "1 checked bag included" },
    { category: "baggage", semantic: "informational", text: "Baggage allowance not supplied for one or more passengers" },
    { category: "change", semantic: "positive", text: "Changes allowed" },
    { category: "refund", semantic: "negative", text: "Not refundable" },
  ], "one-way");

  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(({ title }) => title), ["Carry-on baggage", "Checked baggage", "Change/refund rules"]);
  assert.equal(rows[0]?.detail, "1 included\nAllowance: Not supplied for one or more passengers");
  assert.equal(rows[1]?.detail, "1 included\nAllowance: Not supplied for one or more passengers");
  assert.equal(rows[0]?.semantic, "informational");
  assert.equal(rows[1]?.semantic, "informational");
  assert.match(rows[2]?.detail ?? "", /Changes: Allowed/);
  assert.match(rows[2]?.detail ?? "", /Refunds: Not refundable/);
});

test("native groups matching round-trip change and refund rules without losing their meaning", () => {
  const matching: FlightFareTerm[] = [
    { category: "change", semantic: "positive", text: "Outbound: Changes allowed before departure" },
    { category: "change", semantic: "positive", text: "Return: Changes allowed before departure" },
    { category: "refund", semantic: "negative", text: "Outbound: Not refundable before departure" },
    { category: "refund", semantic: "negative", text: "Return: Not refundable before departure" },
  ];
  assert.deepEqual(nativeFareBenefitRows(matching, "round-trip"), [{
    title: "Change/refund rules",
    detail: "Refunds: Not refundable before departure both ways\nChanges: Allowed before departure both ways",
    semantic: "informational",
    key: "Change/refund rules:2-0-0+0-0-1",
  }]);

  const different: FlightFareTerm[] = [
    { category: "change", semantic: "positive", text: "Outbound: Changes allowed before departure" },
    { category: "change", semantic: "negative", text: "Return: Changes not allowed before departure" },
  ];
  const [differentRules] = nativeFareBenefitRows(different, "round-trip");
  assert.equal(differentRules.title, "Change/refund rules");
  assert.equal(differentRules.detail, "Return changes: Not allowed before departure\nOutbound changes: Allowed before departure");
  assert.equal(differentRules.semantic, "informational");
});

test("native baggage categories stay distinct while directional differences remain in disclosure details", () => {
  const rows = nativeFareBenefitRows([
    { category: "baggage", semantic: "positive", text: "Outbound: 1 carry-on included" },
    { category: "baggage", semantic: "positive", text: "Return: 1 carry-on included" },
    { category: "baggage", semantic: "positive", text: "Outbound: 1 checked bag included" },
    { category: "baggage", semantic: "positive", text: "Return: 2 checked bags included" },
  ], "round-trip");
  assert.deepEqual(rows.map(({ title, detail }) => ({ title, detail })), [
    { title: "Carry-on baggage", detail: "1 included each way" },
    { title: "Checked baggage", detail: "Outbound: 1 included\nReturn: 2 included" },
  ]);
});

test("provider-not-supplied rules remain truthful and neutral", () => {
  assert.deepEqual(nativeFareBenefitRows([{ category: "fare", semantic: "informational", text: "Change and refund rules not supplied by the provider" }], "one-way"), [{
    title: "Change/refund rules", detail: "Not supplied by provider", semantic: "informational", key: "Change/refund rules:0-0-0",
  }]);
});
