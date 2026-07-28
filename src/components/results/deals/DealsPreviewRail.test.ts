import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const rail = readFileSync(new URL("./DealsPreviewRail.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const skeleton = readFileSync(new URL("./DealsPreviewSkeleton.tsx", import.meta.url), "utf8");
const flightCard = readFileSync(new URL("./DealsFlightPreviewCard.tsx", import.meta.url), "utf8");
const hotelCard = readFileSync(new URL("./DealsHotelPreviewCard.tsx", import.meta.url), "utf8");

test("shared rail uses child-aware native phone scrolling", () => {
  assert.match(rail, /import \{ Children, type ReactNode \} from "react"/);
  assert.match(rail, /import \{ cn \} from "@\/lib\/utils"/);
  assert.match(rail, /Children\.count\(children\)/);
  for (const token of ["grid-flow-col", "overflow-x-auto", "overscroll-x-contain", "snap-x", "snap-mandatory", "gap-4", "min-w-0", "max-w-full"]) {
    assert.ok(rail.includes(token), `missing phone class ${token}`);
  }
  assert.match(rail, /\[scrollbar-width:none\]/);
  assert.match(rail, /\[&::-webkit-scrollbar\]:hidden/);
  assert.match(rail, /itemCount > 1/);
  assert.match(rail, /auto-cols-\[minmax\(0,calc\(100%-1\.5rem\)\)\]/);
  assert.match(rail, /auto-cols-\[minmax\(0,100%\)\]/);
});

test("rail restores the existing grid at and above sm", () => {
  for (const token of ["sm:grid-flow-row", "sm:auto-cols-auto", "sm:grid-cols-1", "sm:overflow-visible", "sm:overscroll-x-auto", "sm:snap-none", "sm:pb-0", "md:grid-cols-2", "xl:grid-cols-3"]) {
    assert.ok(rail.includes(token), `missing responsive class ${token}`);
  }
  assert.match(rail, /className="h-full min-w-0 snap-start/);
});

test("visible rails expose lists while hidden skeleton rails do not", () => {
  assert.match(rail, /role=\{ariaHidden \? undefined : "list"\}/);
  assert.match(rail, /aria-label=\{ariaHidden \? undefined : ariaLabel\}/);
  assert.match(rail, /aria-hidden=\{ariaHidden \|\| undefined\}/);
  assert.match(rail, /role=\{ariaHidden \? undefined : "listitem"\}/);
  assert.match(skeleton, /<DealsPreviewRail ariaHidden>/);
  assert.match(skeleton, /length: dealsPreviewLimit/);
});

test("rail has no scripted carousel behavior or extra tab stop", () => {
  for (const forbidden of ["useState", "useEffect", "addEventListener", "scrollTo", "scrollIntoView", "autoplay", "tabIndex", "Swiper", "Embla", "Slick", "Keen", "pagination", "arrow button"]) {
    assert.ok(!rail.includes(forbidden), `unexpected scripted carousel token ${forbidden}`);
  }
});

test("results use exactly one localized rail for each vertically ordered product", () => {
  assert.equal(results.match(/<DealsPreviewRail /g)?.length, 2);
  assert.match(results, /<DealsPreviewRail ariaLabel=\{t\("deals\.results\.flightOptions"\)\}>/);
  assert.match(results, /<DealsPreviewRail ariaLabel=\{t\("deals\.results\.stayOptions"\)\}>/);
  assert.ok(results.indexOf("deals.results.flightOptions") < results.indexOf("deals.results.stayOptions"));
  assert.doesNotMatch(results, /className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"/);
  const carContinuation = results.indexOf("included.car && <section");
  assert.ok(carContinuation > results.lastIndexOf("</DealsPreviewRail>"));
});

test("flight and hotel preview props and selection contracts remain wired", () => {
  const flightRail = results.slice(results.indexOf("<DealsPreviewRail ariaLabel={t(\"deals.results.flightOptions\")}"), results.indexOf("</DealsPreviewRail>"));
  for (const contract of ["key={result.id}", "flight={result}", "badgeKey={badgeKey}", "reasonKey={reasonKey}", "locale={locale}", "t={t}", "selected={plan?.flight?.id === result.id}", "onSelect={() => selectFlight(result)}"]) {
    assert.ok(flightRail.includes(contract), `missing flight contract ${contract}`);
  }
  const hotelStart = results.indexOf("<DealsPreviewRail ariaLabel={t(\"deals.results.stayOptions\")}");
  const hotelRail = results.slice(hotelStart, results.indexOf("</DealsPreviewRail>", hotelStart));
  for (const contract of ["key={result.id}", "hotel={result}", "badgeKey={badgeKey}", "reasonKey={reasonKey}", "locale={locale}", "nights={countHotelNights(search.hotelCheckIn, search.hotelCheckOut)}", "rooms={search.hotelRooms}", "t={t}", "selected={plan?.hotel?.id === result.id}", "onSelect={() => selectHotel(result)}"]) {
    assert.ok(hotelRail.includes(contract), `missing hotel contract ${contract}`);
  }
  for (const card of [flightCard, hotelCard]) {
    assert.match(card, /aria-pressed=\{selected\}/);
    assert.match(card, /onClick=\{onSelect\}/);
    assert.match(card, /disabled/);
  }
});
