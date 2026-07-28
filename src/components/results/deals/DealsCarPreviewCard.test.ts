import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const card = readFileSync(new URL("./DealsCarPreviewCard.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../../../lib/deals/dealsResultsPresentation.ts", import.meta.url), "utf8");

test("the compact Car preview omits promotional and provider clutter", () => {
  for (const forbidden of [
    "reasonKey",
    "t(reasonKey)",
    "deals.results.car.selectionDisclosure",
    "offer.rentalCompanyName || offer.bookingProviderName",
  ]) assert.ok(!card.includes(forbidden), `unexpected ${forbidden}`);
});

test("the compact Car preview retains its content and selection contracts", () => {
  for (const contract of [
    "<article", "CarResultImage", "car.categoryLabel", "car.modelName",
    "car.pickupLocation", "car.pickupType", "car.passengers", "car.bags",
    "car.doors", "car.transmission", "car.airConditioning", "car.mileagePolicy",
    "car.fuelPolicy", "offer.freeCancellation", "offer.payAtPickup",
    "offer.totalPrice", "offer.pricePerDay", "offer.taxesAndFeesIncluded",
    "<button", "aria-pressed={selected}", "disabled={!selectable}",
    "onClick={onSelect}", "deals.results.car.chooseAccessible",
    "deals.results.car.selectedAccessible", "deals.results.car.unsafeSelection",
  ]) assert.ok(card.includes(contract), `missing ${contract}`);
});

test("the compact Car preview does not introduce direct booking links", () => {
  for (const forbidden of ["bookingUrl", "/api/redirect", 'target="_blank"']) {
    assert.ok(!card.includes(forbidden), `unexpected ${forbidden}`);
  }
});

test("removed Deals copy keys are unreachable from their render sources", () => {
  const renderSources = `${card}\n${results}\n${presentation}`;
  for (const key of [
    "deals.results.car.recommended.reason",
    "deals.results.car.lowest.reason",
    "deals.results.car.rating.reason",
    "deals.results.car.selectionDisclosure",
    "deals.results.priceResponsibility",
  ]) assert.ok(!renderSources.includes(key), `unexpected rendered copy key ${key}`);
});
