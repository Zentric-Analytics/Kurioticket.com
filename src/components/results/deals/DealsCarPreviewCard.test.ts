import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const card = readFileSync(new URL("./DealsCarPreviewCard.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../../../lib/deals/dealsResultsPresentation.ts", import.meta.url), "utf8");
const flight = readFileSync(new URL("./DealsFlightPreviewCard.tsx", import.meta.url), "utf8");

test("the compact Car preview omits promotional and provider clutter", () => {
  for (const forbidden of [
    "reasonKey",
    "t(reasonKey)",
    "deals.results.car.selectionDisclosure",
    "offer.rentalCompanyName || offer.bookingProviderName",
  ]) assert.ok(!card.includes(forbidden), `unexpected ${forbidden}`);
});

test("the compact Car preview renders only the model name", () => {
  assert.ok(card.includes("car.modelName"));
  for (const forbidden of [
    "car.orSimilar",
    "deals.results.car.orSimilar",
    "or similar",
  ]) assert.ok(!card.includes(forbidden), `unexpected ${forbidden}`);
  for (const headingClass of [
    "break-words",
    "text-lg",
    "font-extrabold",
    "text-slate-950",
  ]) assert.ok(card.includes(headingClass), `missing ${headingClass}`);
});

test("the Car preview uses the shared badge and disabled provider action", () => {
  const badge = card.indexOf("{t(badgeKey)}");
  assert.ok(badge >= 0 && badge < card.indexOf("<CarResultImage"));
  assert.equal(card.match(/\{t\(badgeKey\)\}/g)?.length, 1);
  for (const contract of [
    "<article", "p-5 pb-4", "inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-[#004BB8]", "CarResultImage", "car.categoryLabel", "car.modelName",
    "car.pickupLocation", "car.pickupType", "car.passengers", "car.bags", "car.doors", "car.transmission", "car.airConditioning", "car.mileagePolicy", "car.fuelPolicy", "offer.freeCancellation", "offer.payAtPickup", "offer.totalPrice", "offer.pricePerDay", "offer.taxesAndFeesIncluded",
    "mt-5 border-t border-slate-200 pt-4", "Button", 'variant="accent"', 'size="lg"', 'className="w-full"', "disabled", "continueToProvider", "ArrowRight", "aria-describedby", "useId", "deals.results.providerHandoff.unavailable",
  ]) assert.ok(card.includes(contract), `missing ${contract}`);
  for (const forbidden of ["aria-pressed", "onClick={onSelect}", "selected: boolean", "selectable", "buildCarDetailsHref", "validateDealsCarDetailsPath", "bookingUrl", "/api/redirect", 'target="_blank"', "Choose car"]) assert.ok(!card.includes(forbidden), `unexpected ${forbidden}`);
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


test("the Car preview separates specifications, policies, pricing, and its action", () => {
  for (const contract of ["divide-y divide-slate-200 border-y border-slate-200", "py-4", "grid-cols-2", "gap-x-4", "gap-y-2", "flex-wrap", "gap-2", "mt-auto pt-5", "mt-5 border-t border-slate-200 pt-4"]) assert.ok(card.includes(contract), `missing ${contract}`);
  const pickup = card.indexOf("car.pickupLocation"); const group = card.indexOf("divide-y divide-slate-200 border-y border-slate-200"); const specifications = card.indexOf("specs.map", group); const policies = card.indexOf("car.mileagePolicy", specifications); const price = card.indexOf("mt-auto pt-5", policies); const footer = card.indexOf("mt-5 border-t border-slate-200 pt-4", price);
  assert.ok(pickup < group && group < specifications && specifications < policies && policies < price && price < footer);
  for (const forbidden of ["divide-x", "border-dashed", "border-blue", 'role="separator"']) assert.ok(!card.includes(forbidden), `unexpected ${forbidden}`);
});

test("the Flight divider source remains the visual reference", () => {
  assert.ok(flight.includes("divide-y divide-slate-200 border-y border-slate-200"));
  assert.ok(flight.includes("mt-5 border-t border-slate-200 pt-4"));
});
