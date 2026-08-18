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

test("desktop Flights exposes the complete trip-type selector", () => {
  assert.match(
    formSource,
    /\.\.\.defaultTripTypeOptions,[\s\S]*?\["multi-city", "Multi-city"\] as const/,
  );
  assert.match(
    formSource,
    /value === "round-trip"[\s\S]*?"Round-trip"[\s\S]*?value === "one-way"[\s\S]*?"One-way"[\s\S]*?"Multi-city"/,
  );
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
  const airportControl = formSource.slice(
    formSource.indexOf("const AirportFieldControl"),
    formSource.indexOf("type DesktopFlightPopoverProps"),
  );

  assert.doesNotMatch(airportControl, /Clear \$\{label\.toLowerCase\(\)\}/);
  assert.doesNotMatch(airportControl, /<X\b/);
  assert.match(airportControl, /pe-0/);
});

test("desktop popovers flip into the available viewport and scroll internally", () => {
  assert.match(formSource, /const availableBelow =/);
  assert.match(formSource, /const availableAbove =/);
  assert.match(formSource, /const openAbove =/);
  assert.match(formSource, /overflow-y-auto overscroll-contain/);
  assert.match(formSource, /requestAnimationFrame\(updatePosition\)/);
  assert.match(formSource, /new ResizeObserver\(\(\) => updatePosition\(\)\)/);
  assert.match(formSource, /maxHeight=\{300\}/);
});

test("desktop flight hero uses the reduced production height", () => {
  assert.match(
    landingSource,
    /min-h-\[28\.75rem\][\s\S]*?lg:min-h-\[31\.75rem\]/,
  );
  assert.doesNotMatch(landingSource, /lg:min-h-\[36rem\]/);
  assert.match(landingSource, /brightness-\[1\.04\]/);
});
