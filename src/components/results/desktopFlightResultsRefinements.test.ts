import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const card = readFileSync(new URL("./FlightCard.tsx", import.meta.url), "utf8");
const filters = readFileSync(new URL("./DesktopFlightFilters.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const mobileCard = readFileSync(new URL("./MobileFlightCard.tsx", import.meta.url), "utf8");
const mobileFilters = readFileSync(new URL("./MobileFlightFiltersSheet.tsx", import.meta.url), "utf8");
const globals = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("desktop results use the mobile visual system while retaining desktop structure", () => {
  assert.match(results, /data-flight-results-main className="bg-\[#F5F7FB\][^"]*lg:bg-\[#F5F7FB\]"/);
  assert.match(card, /data-flight-result-card[\s\S]*?border-\[#D8E1EC\] bg-white/);
  assert.doesNotMatch(card, /lg:bg-\[#FEFFFF\]|lg:border-\[#CDD8E5\]/);
  assert.match(globals, /\.flight-card-body[\s\S]*grid-template-areas: "legs fare" "details details"/);
  assert.match(card, /flight-card-details mt-3 grid min-w-0 flex-1 grid-cols-3/);
  assert.match(card, /text-\[#004BB8\]/);
  assert.match(card, /bg-emerald-50 text-emerald-700/);
  assert.match(card, /bg-blue-50 text-\[#004BB8\]/);
  assert.match(card, /variant="ghost"/);
  assert.match(card, /<ChevronRight className="h-4 w-4"/);
  assert.doesNotMatch(card, /flight-card-view-button[^\n]*bg-\[#004BB8\][^\n]*text-white/);
  assert.match(mobileCard, /View deals/);
});

test("desktop Flight filters use the production Cars surface without touching mobile filters", () => {
  assert.match(filters, /desktop-filter-sidebar cars-desktop-filter-surface/);
  assert.match(filters, /bg-\[#F2F4F8\] p-0 shadow-none/);
  assert.match(filters, /cars-desktop-filter-icon[^\n]*text-\[#07133B\]/);
  assert.match(filters, /desktop-filter-sidebar__count/);
  assert.match(filters, /t\("clearAll"\)/);
  assert.match(filters, /font-bold uppercase leading-4 tracking-\[0\.11em\]/);
  assert.match(filters, /min-h-8[^\n]*text-\[13px\]/);
  assert.match(filters, /checked && "font-semibold text-\[#021C2B\]"/);
  assert.match(filters, /peer-focus-visible:ring-offset-\[#F2F4F8\]/);
  assert.match(filters, /type="search"[\s\S]*setAirlineSearch/);
  assert.match(filters, /secondaryLabel=\{option\.rightLabel/);
  assert.doesNotMatch(mobileFilters, /cars-desktop-filter-surface|desktop-filter-sidebar/);
});
