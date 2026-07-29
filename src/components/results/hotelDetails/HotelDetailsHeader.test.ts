import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync(
  new URL("./HotelDetailsHeader.tsx", import.meta.url),
  "utf8",
);
const clientSource = readFileSync(
  new URL("../HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);

function getClassName(tag: "div" | "h1" | "Button", token: string) {
  const match = headerSource.match(
    new RegExp(`<${tag}[^>]*className="([^"]*${token}[^"]*)"`),
  );
  assert.ok(match, `missing ${tag} class containing ${token}`);
  return match[1];
}

test("places one compact Save control opposite the badges on mobile", () => {
  const grid = getClassName("div", "grid-cols-\\[minmax\\(0,1fr\\)_auto\\]");
  const badges = getClassName("div", "flex min-w-0 flex-wrap");
  const button = getClassName("Button", "whitespace-nowrap");
  const heading = getClassName("h1", "max-w-4xl");

  for (const token of ["grid", "min-w-0", "grid-cols-[minmax(0,1fr)_auto]"]) {
    assert.ok(grid.includes(token));
  }
  for (const token of ["col-start-1", "row-start-1", "flex", "min-w-0", "flex-wrap", "items-center", "gap-2"]) {
    assert.ok(badges.includes(token));
  }
  for (const token of ["col-start-2", "row-start-1", "shrink-0", "whitespace-nowrap"]) {
    assert.ok(button.includes(token));
  }
  for (const token of ["col-span-2", "row-start-2", "min-w-0", "break-words"]) {
    assert.ok(heading.includes(token));
  }
  assert.ok(!button.split(/\s+/).includes("w-full"));
  assert.ok(!button.split(/\s+/).includes("absolute"));
});

test("restores the existing stacked layout from sm through md", () => {
  const grid = getClassName("div", "sm:grid-cols-1");
  const button = getClassName("Button", "sm:row-start-3");
  const heading = getClassName("h1", "sm:col-span-1");

  assert.ok(grid.includes("sm:grid-cols-1"));
  for (const token of ["sm:col-start-1", "sm:row-start-3", "sm:mt-4", "sm:w-full"]) {
    assert.ok(button.includes(token));
  }
  assert.ok(heading.includes("sm:col-span-1"));
});

test("restores the two-column header layout at md", () => {
  const grid = getClassName("div", "md:grid-cols-\\[minmax\\(0,1fr\\)_auto\\]");
  const badges = getClassName("div", "md:col-span-2");
  const button = getClassName("Button", "md:justify-self-end");
  const heading = getClassName("h1", "md:col-start-1");

  assert.ok(grid.includes("md:grid-cols-[minmax(0,1fr)_auto]"));
  assert.ok(badges.includes("md:col-span-2"));
  for (const token of ["md:col-start-2", "md:row-start-2", "md:w-auto", "md:justify-self-end"]) {
    assert.ok(button.includes(token));
  }
  for (const token of ["md:col-start-1", "md:row-start-2"]) {
    assert.ok(heading.includes(token));
  }
});

test("renders one heading, Save button, and Heart without unsafe layout utilities", () => {
  assert.equal(headerSource.match(/<Button\b/g)?.length, 1);
  assert.equal(headerSource.match(/<h1\b/g)?.length, 1);
  assert.equal(headerSource.match(/<Heart\b/g)?.length, 1);
  assert.doesNotMatch(headerSource, /\b(?:absolute|fixed|sticky|line-clamp|truncate)\b/);
  const heading = getClassName("h1", "max-w-4xl");
  assert.ok(!heading.split(/\s+/).includes("overflow-hidden"));
});

test("preserves the Save behavior and accessible contract", () => {
  for (const contract of [
    'type="button"',
    'variant="secondary"',
    'size="sm"',
    "aria-label={savedHotelLabel}",
    "aria-pressed={isSaved}",
    "saveRequiresLiveRateText",
    "disabled={!isSaved && !hasValidPrice}",
    "onClick={onSave}",
    'fill={isSaved ? "currentColor" : "none"}',
    "<span>{saveActionText}</span>",
  ]) {
    assert.ok(headerSource.includes(contract), `missing ${contract}`);
  }
});

test("preserves badges and all remaining header content", () => {
  for (const contract of [
    "badges.map",
    "<Badge key={badge}",
    'variant="brand"',
    'size="sm"',
    "DetailsBackLink",
    "backToResultsText",
    "{name}",
    "starRatingAriaLabel",
    "locationParts.map",
    "reviewBandVisible",
    "reviewScore",
    "reviewLabel",
    "reviewCountText",
    "isGoogleMapsProvider",
    "sourceAttributions.map",
    "isSafeAttributionUrl",
  ]) {
    assert.ok(headerSource.includes(contract), `missing ${contract}`);
  }
});

test("HotelDetailsClient continues to supply every header prop", () => {
  const usage = clientSource.slice(
    clientSource.indexOf("<HotelDetailsHeader"),
    clientSource.indexOf("/>", clientSource.indexOf("<HotelDetailsHeader")) + 2,
  );
  for (const prop of [
    "resultsHref", "backToResultsText", "badges", "name", "savedHotelLabel",
    "isSaved", "hasValidPrice", "saveRequiresLiveRateText", "onSave",
    "saveActionText", "starRating", "starRatingAriaLabel",
    "isGoogleMapsProvider", "locationParts", "reviewBandVisible",
    "reviewScore", "reviewLabel", "reviewCountText", "sourceAttributions",
    "isSafeAttributionUrl",
  ]) {
    assert.match(usage, new RegExp(`\\b${prop}=`), `missing ${prop}`);
  }
});
