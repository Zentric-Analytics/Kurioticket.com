import assert from "node:assert/strict";
import test from "node:test";
import { cmsHotelCountryOptions, filterCmsHotelsByCountry, readCmsHotelCountry } from "./adminCmsHotelCountry";
import { homepageCmsListNavigation, faqCmsListNavigation } from "./adminContentNavigation";

const rows = [
  { id: "a", draftPayload: { name: "London", country: "United Kingdom" } },
  { id: "b", draftPayload: { name: "Lagos", country: "Nigeria" } },
  { id: "c", draftPayload: { name: "Manchester", country: "United Kingdom" } },
  { id: "d", draftPayload: null },
];

test("Hotel country filter uses all draft countries and leaves saved rows unchanged", () => {
  assert.deepEqual(cmsHotelCountryOptions(rows), ["Nigeria", "United Kingdom"]);
  assert.deepEqual(filterCmsHotelsByCountry(rows, "United Kingdom").map(row => row.id), ["a", "c"]);
  assert.deepEqual(filterCmsHotelsByCountry(rows, "").map(row => row.id), ["a", "b", "c", "d"]);
  assert.equal(readCmsHotelCountry({ country: " Nigeria " }), "Nigeria");
  assert.equal(readCmsHotelCountry({ country: 123 }), "");
});

test("Hotel country survives editor return links and unsafe query values are ignored", () => {
  const nav = homepageCmsListNavigation("hotel-destinations", { country: "United Kingdom", status: "PUBLISHED", q: "London" });
  assert.equal(nav.query, "market=GLOBAL&status=PUBLISHED&q=London&country=United+Kingdom");
  assert.equal(homepageCmsListNavigation("hotel-destinations", { country: "\u0000bad" }).query, "market=GLOBAL");
});

test("FAQ navigation ignores old category parameters after category control removal", () => {
  assert.equal(faqCmsListNavigation({ status: "PUBLISHED", q: "refund", category: "General" }).query, "status=PUBLISHED&q=refund");
});
