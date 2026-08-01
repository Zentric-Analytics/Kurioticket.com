import assert from "node:assert/strict";
import test from "node:test";
import { HOMEPAGE_AIRPORT_RESULT_LIMIT, homepageAirports, searchHomepageAirports } from "./homepageAirports";
import { homepageAirportGroups } from "./homepageAirportGroups";

const codes = (query: string) => searchHomepageAirports(query).map((result) => result.code);

const expectations: Record<string, readonly string[]> = {
  NYC: ["NYC", "JFK", "EWR", "LGA", "SWF"],
  LON: ["LON", "LHR", "LGW", "STN", "LTN", "LCY", "SEN"],
  PAR: ["PAR", "CDG", "ORY", "BVA"], TYO: ["TYO", "HND", "NRT"],
  SEL: ["SEL", "ICN", "GMP"], WAS: ["WAS", "IAD", "DCA", "BWI"],
  CHI: ["CHI", "ORD", "MDW"], MIL: ["MIL", "MXP", "LIN", "BGY"],
  ROM: ["ROM", "FCO", "CIA"], RIO: ["RIO", "GIG", "SDU"],
  SAO: ["SAO", "GRU", "CGH", "VCP"], BUE: ["BUE", "EZE", "AEP"],
};

for (const [query, expected] of Object.entries(expectations)) test(`${query} returns its metro and member airports`, () => assert.deepEqual(codes(query).slice(0, expected.length), expected));

test("city name returns the metro before New York airports", () => assert.deepEqual(codes("New York").slice(0, 5), expectations.NYC));
test("an exact airport ranks before its broader metro context", () => assert.equal(codes("JFK")[0], "JFK"));
test("direct airport code searches remain available", () => {
  for (const code of ["JFK", "LHR", "LOS"]) assert.equal(codes(code)[0], code);
});
test("results are capped and deduplicated", () => { const results = searchHomepageAirports("a"); assert.ok(results.length <= HOMEPAGE_AIRPORT_RESULT_LIMIT); assert.equal(new Set(results.map(({ code }) => code)).size, results.length); });
test("empty search preserves the original twenty defaults", () => assert.deepEqual(searchHomepageAirports(""), homepageAirports.slice(0, 20)));
test("direct airport name search remains available", () => assert.equal(codes("Heathrow")[0], "LHR"));
test("every group member is a real homepage airport", () => { const catalogue = new Set(homepageAirports.map(({ code }) => code)); for (const group of homepageAirportGroups) for (const code of group.airportCodes) assert.ok(catalogue.has(code), `${group.code} member ${code}`); });
test("the homepage search is synchronous and local", () => assert.ok(!searchHomepageAirports.toString().match(/fetch|axios|AbortController|setTimeout/)));
