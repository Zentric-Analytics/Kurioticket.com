import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const rail = readFileSync(new URL("./DealsPreviewRail.tsx", import.meta.url), "utf8");
const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const skeleton = readFileSync(new URL("./DealsPreviewSkeleton.tsx", import.meta.url), "utf8");
const flightCard = readFileSync(new URL("./DealsFlightPreviewCard.tsx", import.meta.url), "utf8");
const hotelCard = readFileSync(new URL("./DealsHotelPreviewCard.tsx", import.meta.url), "utf8");
const carCard = readFileSync(new URL("./DealsCarPreviewCard.tsx", import.meta.url), "utf8");

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

test("mobile rail items use natural heights before restoring stretch at sm", () => {
  for (const contract of [
    "items-start",
    "sm:items-stretch",
    "h-auto",
    "self-start",
    "sm:h-full",
    "sm:self-stretch",
    "min-w-0",
  ]) assert.ok(rail.includes(contract), `missing ${contract}`);

  assert.doesNotMatch(rail, /className="h-full min-w-0 snap-start/);
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
    "useRef",
    "ResizeObserver",
    "IntersectionObserver",
    "addEventListener",
    "scrollLeft",
    "requestAnimationFrame",
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

test("preview cards retain full-height columns and price anchors", () => {
  for (const card of [flightCard, hotelCard, carCard]) {
    assert.match(card, /h-full/);
    assert.match(card, /flex-col/);
    assert.match(card, /mt-auto pt-5/);
  }
  assert.doesNotMatch(carCard, /car\.orSimilar|deals\.results\.car\.orSimilar/);
});

test("Deals results replace separate product rails with one combined package list", () => {
  assert.doesNotMatch(results, /<DealsPreviewRail ariaLabel=/);
  assert.match(results, /<DealsPackageCard candidate=\{candidate\}/);
  assert.match(results, /role="list" aria-label=\{t\("deals.results.package.title"\)\}/);
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
