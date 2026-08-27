import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const start = source.indexOf(
  'function renderCompactSearchForm(placement: "mobile" | "desktop")',
);
const end = source.indexOf('if (\n      placement === "desktop"', start);
const mobileDrawer = source.slice(start, end);

test("mobile Edit Flight Search drawer retains its accessible structure and actions", () => {
  assert.ok(start >= 0);
  assert.ok(end > start);
  assert.match(mobileDrawer, /id="flight-mobile-search-title"/);
  assert.match(mobileDrawer, /\{t\("editFlightSearch"\)\}/);
  assert.match(mobileDrawer, /aria-label=\{t\("closeEditSearch"\)\}/);
  assert.match(mobileDrawer, /onClick=\{\(\) => closeMobileSearchDrawer\(\)\}/);
  assert.match(mobileDrawer, /<X className="h-5 w-5" aria-hidden="true" \/>/);
  assert.match(mobileDrawer, /onSubmit=\{handleCompactSearchSubmit\}/);
  assert.match(mobileDrawer, /type="submit"[\s\S]*\{t\("search"\)\}/);
});

test("trip types use three equal, tappable, non-wrapping columns", () => {
  assert.match(mobileDrawer, /data-mobile-trip-type-grid/);
  assert.match(mobileDrawer, /grid-cols-3/);
  assert.match(mobileDrawer, /min-h-11/);
  assert.match(mobileDrawer, /whitespace-nowrap/);
  assert.match(mobileDrawer, /role="radio"/);
  assert.match(mobileDrawer, /aria-checked=\{selected\}/);
  assert.match(mobileDrawer, /handleMobileTripTypeChange\(option\.value\)/);
  assert.doesNotMatch(
    mobileDrawer.match(/data-mobile-trip-type-grid[\s\S]*?<\/div>/)?.[0] ?? "",
    /flex-wrap/,
  );
});

test("all mobile fields share label and aligned icon-value row anatomy", () => {
  for (const field of ["origin", "destination", "dates", "travelers"]) {
    assert.match(mobileDrawer, new RegExp(`data-mobile-field="${field}"`));
  }
  assert.equal(mobileDrawer.match(/data-mobile-value-row/g)?.length, 4);
  assert.match(mobileDrawer, /grid-cols-\[22px_minmax\(0,1fr\)_20px\]/);
  assert.equal(
    mobileDrawer.match(/<MapPin[\s\S]*?className=\{mobileValueIconClass\}/g)
      ?.length,
    2,
  );
  assert.match(
    mobileDrawer,
    /<Calendar[\s\S]*?className=\{mobileValueIconClass\}/,
  );
  assert.match(
    mobileDrawer,
    /<UserRound[\s\S]*?className=\{mobileValueIconClass\}/,
  );
  assert.match(
    mobileDrawer,
    /data-mobile-field="travelers"[\s\S]*?<ChevronDown className="h-4 w-4 justify-self-end/,
  );
});

test("route fields omit trailing chevrons while travelers retains its disclosure", () => {
  const fieldButton = (field: string) => {
    const marker = mobileDrawer.indexOf(`data-mobile-field="${field}"`);
    const buttonStart = mobileDrawer.lastIndexOf("<button", marker);
    const buttonEnd = mobileDrawer.indexOf("</button>", marker);
    return mobileDrawer.slice(buttonStart, buttonEnd + "</button>".length);
  };
  const originField = fieldButton("origin");
  const destinationField = fieldButton("destination");
  const travelersField = fieldButton("travelers");

  for (const routeField of [originField, destinationField]) {
    assert.match(routeField, /aria-haspopup="dialog"/);
    assert.match(routeField, /<MapPin/);
    assert.doesNotMatch(routeField, /<ChevronDown/);
  }
  assert.match(originField, /setActiveMobileAirportPicker\("origin"\)/);
  assert.match(
    destinationField,
    /setActiveMobileAirportPicker\("destination"\)/,
  );
  assert.match(travelersField, /<UserRound/);
  assert.match(travelersField, /<ChevronDown/);
});

test("route swap reuses the existing swap handler in a centered touch target", () => {
  assert.match(mobileDrawer, /data-mobile-swap-control/);
  assert.match(mobileDrawer, /onClick=\{handleSwapLocations\}/);
  assert.match(mobileDrawer, /h-11 w-11/);
  assert.match(mobileDrawer, /left-1\/2 top-1\/2/);
});

test("the stacked drawer guards narrow screens from horizontal overflow", () => {
  assert.match(mobileDrawer, /overflow-x-hidden overflow-y-auto/);
  assert.match(mobileDrawer, /flex w-full min-w-0 max-w-xl flex-col/);
  assert.match(mobileDrawer, /relative grid min-w-0 gap-3/);
  assert.doesNotMatch(mobileDrawer, /w-\[(?:320|360|375|390|412|430)px\]/);
});
