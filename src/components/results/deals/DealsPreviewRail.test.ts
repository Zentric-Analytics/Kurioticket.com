import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const rail = readFileSync(new URL("./DealsPreviewRail.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const skeleton = readFileSync(new URL("./DealsPreviewSkeleton.tsx", import.meta.url), "utf8");
const flightCard = readFileSync(new URL("./DealsFlightPreviewCard.tsx", import.meta.url), "utf8");
const hotelCard = readFileSync(new URL("./DealsHotelPreviewCard.tsx", import.meta.url), "utf8");

test("the shared rail uses native horizontal scrolling and child-aware geometry", () => {
  for (const contract of [
    "Children.count(children)",
    "cn(",
    "grid-flow-col",
    "overflow-x-auto",
    "overscroll-x-contain",
    "snap-x",
    "snap-mandatory",
    "scroll-smooth",
    "gap-4",
    "min-w-0",
    "max-w-full",
  ]) assert.ok(rail.includes(contract), `missing ${contract}`);

  assert.match(rail, /hasMultipleChildren[\s\S]*auto-cols-\[minmax\(17rem,calc\(100vw-4\.5rem\)\)\][\s\S]*auto-cols-\[minmax\(0,100%\)\]/);
  assert.doesNotMatch(rail, /auto-cols-\[minmax\(0,calc\(100%-1\.5rem\)\)\]|calc\(100%-1\.5rem\)/);
  assert.doesNotMatch(rail, /hasMultipleChildren[\s\S]*\? "auto-cols-\[minmax\(0,100%\)\]"/);
  assert.match(rail, /px-1/);
  assert.match(rail, /gap-4/);
});

test("the rail snaps each card and hides native scrollbars", () => {
  for (const contract of [
    "snap-start",
    "snap-always",
    "sm:snap-none",
    "[scrollbar-width:none]",
    "[-ms-overflow-style:none]",
    "[&::-webkit-scrollbar]:hidden",
  ]) assert.ok(rail.includes(contract), `missing ${contract}`);
});

test("the phone rail fully resets to the established layouts at sm and above", () => {
  for (const contract of [
    "sm:grid-flow-row",
    "sm:auto-cols-auto",
    "sm:grid-cols-1",
    "sm:overflow-visible",
    "sm:overscroll-x-auto",
    "sm:snap-none",
    "sm:scroll-auto",
    "sm:px-0",
    "sm:pb-0",
    "sm:pt-0",
    "md:grid-cols-2",
    "xl:grid-cols-3",
  ]) assert.ok(rail.includes(contract), `missing ${contract}`);
});

test("visible and hidden rails expose the appropriate accessibility semantics", () => {
  assert.match(rail, /role: "list", "aria-label": props\.ariaLabel/);
  assert.match(rail, /role: "listitem"/);
  assert.match(rail, /"aria-hidden": true/);
  assert.match(rail, /isHidden \? \{\} : \{ role: "listitem" \}/);
  assert.doesNotMatch(rail, /ariaHidden[\s\S]*role="list"/);
});

test("the rail contains no scripted carousel behavior or keyboard stop", () => {
  for (const forbidden of [
    "useState",
    "useEffect",
    "addEventListener",
    "onScroll",
    "onTouchStart",
    "onTouchMove",
    "onPointerDown",
    "scrollTo",
    "scrollIntoView",
    "setInterval",
    "setTimeout",
    "autoplay",
    "tabIndex",
    "Swiper",
    "Embla",
    "Slick",
    "Keen",
    "pagination",
  ]) assert.ok(!rail.includes(forbidden), `unexpected ${forbidden}`);
});

test("Flight, Stay and Car use exactly three separate localized rails", () => {
  const visibleRails = results.match(/<DealsPreviewRail ariaLabel=/g) ?? [];
  assert.equal(visibleRails.length, 3);
  const flight = results.indexOf('<DealsPreviewRail ariaLabel={t("deals.results.flightOptions")}');
  const stay = results.indexOf('<DealsPreviewRail ariaLabel={t("deals.results.stayOptions")}');
  const cars = results.indexOf('<DealsPreviewRail ariaLabel={t("deals.results.carOptions")}', stay);
  assert.ok(flight >= 0 && flight < stay && stay < cars);
});

test("the Flight and Hotel rail mappings preserve every card prop", () => {
  const flight = results.slice(
    results.indexOf('<DealsPreviewRail ariaLabel={t("deals.results.flightOptions")}'),
    results.indexOf("</DealsPreviewRail>"),
  );
  const stayStart = results.indexOf('<DealsPreviewRail ariaLabel={t("deals.results.stayOptions")}');
  const stay = results.slice(stayStart, results.indexOf("</DealsPreviewRail>", stayStart));

  for (const prop of [
    "key={result.id}", "flight={result}", "badgeKey={badgeKey}",
    "reasonKey={reasonKey}", "locale={locale}", "t={t}",
    "selected={plan?.flight?.id === result.id}",
    "onSelect={() => selectFlight(result)}",
  ]) assert.ok(flight.includes(prop), `missing Flight prop ${prop}`);

  for (const prop of [
    "key={result.id}", "hotel={result}", "badgeKey={badgeKey}",
    "reasonKey={reasonKey}", "locale={locale}",
    "nights={countHotelNights(search.hotelCheckIn, search.hotelCheckOut)}",
    "rooms={search.hotelRooms}", "t={t}",
    "selected={plan?.hotel?.id === result.id}",
    "onSelect={() => selectHotel(result)}",
  ]) assert.ok(stay.includes(prop), `missing Hotel prop ${prop}`);
});

test("the Car rail mapping preserves selection props without a recommendation reason", () => {
  const carsStart = results.indexOf('<DealsPreviewRail ariaLabel={t("deals.results.carOptions")}');
  const cars = results.slice(carsStart, results.indexOf("</DealsPreviewRail>", carsStart));

  for (const prop of [
    "key={result.id}", "car={result}", "badgeKey={badgeKey}",
    "locale={locale}", "search={carSearch}", "t={t}",
    "selected={plan?.car?.id === result.id}",
    "onSelect={() => selectCar(result)}",
  ]) assert.ok(cars.includes(prop), `missing Car prop ${prop}`);
  assert.doesNotMatch(cars, /reasonKey/);
});

test("loading skeletons share the hidden rail and retain their visual contract", () => {
  assert.match(skeleton, /<DealsPreviewRail ariaHidden>/);
  assert.match(skeleton, /dealsPreviewLimit/);
  assert.match(skeleton, /motion-safe:animate-pulse/);
});

test("preview-card selection and unavailable-provider actions remain intact", () => {
  for (const card of [flightCard, hotelCard]) {
    assert.match(card, /aria-pressed=\{selected\}/);
    assert.match(card, /onClick=\{onSelect\}/);
    assert.match(card, /disabled aria-describedby=\{unavailableDescriptionId\}/);
    assert.match(card, /continueToProvider/);
  }
});
