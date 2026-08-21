import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const formSource = readFileSync(
  "src/components/search/StandaloneFlightSearchForm.tsx",
  "utf8",
);
const landingSource = readFileSync(
  "src/components/flights/FlightLandingClient.tsx",
  "utf8",
);
const fieldPrimitivesSource = readFileSync(
  "src/components/search/FlightSearchFieldPrimitives.tsx",
  "utf8",
);

test("desktop Flights exposes the complete trip-type selector", () => {
  assert.match(
    formSource,
    /\.\.\.defaultTripTypeOptions,[\s\S]*?\["multi-city", "Multi-city"\] as const/,
  );
  assert.match(
    formSource,
    /value === "round-trip"[\s\S]*?"Round trip"[\s\S]*?value === "one-way"[\s\S]*?"One way-trip"[\s\S]*?"Multi-city trip"/,
  );
  assert.match(formSource, /\["round-trip", t\("roundTrip"\)\]/);
  assert.match(formSource, /\["one-way", t\("oneWay"\)\]/);
  assert.match(formSource, /\["multi-city", "Multi-city"\] as const/);
  assert.doesNotMatch(formSource, /value === "round-trip"[\s\S]*?"Round-trip"/);
  assert.match(formSource, /data-testid="desktop-flight-landing-identity"/);
  assert.match(
    formSource,
    /className="hidden w-fit[^"]*sm:flex"[\s\S]*?data-testid="desktop-flight-landing-identity"/,
  );
  assert.match(
    formSource,
    /bg-transparent text-slate-950 ring-0 shadow-none hover:bg-transparent/,
  );
});

test("desktop airport fields do not render inline clear controls", () => {
  assert.match(formSource, /<FlightAirportFieldControl/);
  assert.doesNotMatch(fieldPrimitivesSource, /Clear \$\{label\.toLowerCase\(\)\}/);
  assert.doesNotMatch(fieldPrimitivesSource, /<X\b/);
  assert.match(fieldPrimitivesSource, /pe-0/);
  assert.match(fieldPrimitivesSource, /<MapPin[\s\S]*?sm:flex/);
});

test("desktop field values use neutral leading icons and title-cased English travelers", () => {
  assert.match(
    formSource,
    /<Calendar[\s\S]*?text-slate-500[\s\S]*?\{dateSummary\}/,
  );
  assert.match(
    formSource,
    /<UserRound[\s\S]*?text-slate-500[\s\S]*?\{travelerSummary\}/,
  );
  assert.match(
    formSource,
    /const isEnglish = locale\.toLowerCase\(\)\.startsWith\("en"\)/,
  );
  assert.match(formSource, /toLocaleUpperCase\(locale\)/);
});

test("desktop popovers flip into the available viewport and scroll internally", () => {
  assert.match(fieldPrimitivesSource, /const availableBelow =/);
  assert.match(fieldPrimitivesSource, /const availableAbove =/);
  assert.match(fieldPrimitivesSource, /const openAbove =/);
  assert.match(fieldPrimitivesSource, /overflow-y-auto overscroll-contain/);
  assert.match(fieldPrimitivesSource, /requestAnimationFrame\(updatePosition\)/);
  assert.match(fieldPrimitivesSource, /new ResizeObserver\(updatePosition\)/);
  assert.match(formSource, /maxHeight=\{300\}/);
});

test("desktop airport suggestions stay above the fields with one scroll owner", () => {
  const airportSuggestions = formSource.slice(
    formSource.indexOf("const renderAirportSuggestions"),
    formSource.indexOf("const renderDateCalendar"),
  );

  assert.match(airportSuggestions, /placement="above"/);
  assert.match(airportSuggestions, /offset=\{10\}/);
  assert.doesNotMatch(airportSuggestions, /max-h-\[280px\]/);
  assert.doesNotMatch(airportSuggestions, /overflow-y-auto/);
  assert.match(fieldPrimitivesSource, /placement\?: "auto" \| "above" \| "below"/);
  assert.match(
    fieldPrimitivesSource,
    /bottom: openAbove \? Math\.max\(gutter, viewportHeight - anchorRect\.top \+ offset\) : null/,
  );
  assert.match(fieldPrimitivesSource, /bottom: position\.bottom \?\? undefined/);
});

test("desktop flight hero uses the reduced production height", () => {
  assert.match(
    landingSource,
    /min-h-\[28\.75rem\][\s\S]*?lg:min-h-\[31\.75rem\]/,
  );
  assert.doesNotMatch(landingSource, /lg:min-h-\[36rem\]/);
  assert.match(landingSource, /brightness-\[1\.04\]/);
});
