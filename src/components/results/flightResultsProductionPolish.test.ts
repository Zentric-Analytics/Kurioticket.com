import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile results rhythm has no decorative divider or oversized spacer", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /data-flight-mobile-results-summary/);
  assert.match(source, /px-4 py-3/);
  assert.match(source, /data-flight-mobile-results-shortcuts/);
  assert.match(source, /pt-2/);
  assert.doesNotMatch(source, /data-flight-mobile-results-shortcuts[\s\S]{0,300}pt-12/);
});

test("mobile filter sheet has one contextual reset and a result-count action", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );
  const start = source.lastIndexOf('id="flight-mobile-filters-dialog"');
  const end = source.indexOf("</aside>", start);
  const sheet = source.slice(start, end);

  assert.match(sheet, /activeFilterCount > 0 \?/);
  assert.match(sheet, /\{t\("clearAll"\)\}/);
  assert.match(sheet, /formatResultsFound\(sortedResults\.length, t\)/);
  assert.match(sheet, /env\(safe-area-inset-bottom\)/);
  assert.match(sheet, /overflow-y-auto overscroll-contain/);
  assert.match(source, /mb-2\.5 text-sm font-bold leading-5/);
  assert.doesNotMatch(source, /font-extrabold uppercase leading-5 tracking-\[0\.14em\]/);
  assert.match(source, /min-h-11 gap-3 px-1\.5/);
});

test("pagination uses an occluding full-page transition with an accessible status", async () => {
  const source = await readFile(
    new URL("./FlightResultsClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /data-flight-results-transition-cover/);
  assert.match(source, /fixed inset-0 z-\[9990\]/);
  assert.match(source, /className="sr-only" role="status" aria-live="polite"/);
  assert.match(source, /motion-reduce:animate-none/);
});

test("desktop cards pair each leg time with the airline logo while keeping one identity line", async () => {
  const source = await readFile(new URL("./FlightCard.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /flight-card-airline-name truncate whitespace-nowrap/);
  assert.match(source, /flight\.airlineName[\s\S]*flight\.flightNumber/);
  assert.match(source, /flight-card-leg-time-row[\s\S]*flight-card-leg-logo[\s\S]*<AirlineLogo flight=\{flight\}/);
  assert.match(source, /visibleLegs\.map[\s\S]*flight=\{flight\}/);
  assert.match(styles, /\.flight-card-header-logo \{\s*display: none;/);
  assert.match(styles, /@media \(max-width: 1023px\)[\s\S]*\.flight-card-header-logo \{\s*display: block;/);
  assert.match(styles, /\.flight-card-time \{\s*font-size: 1\.25rem;/);
});

test("desktop nearby fares use a contained mobile-like hierarchy", async () => {
  const source = await readFile(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
  const start = source.indexOf("data-desktop-nearby-fare-rail");
  const strip = source.slice(start, source.indexOf("Next nearby fare date", start) + 300);

  assert.match(strip, /rounded-xl border border-slate-200 bg-white/);
  assert.match(strip, /min-h-\[72px\]/);
  assert.match(strip, /rounded-lg/);
  assert.match(strip, /selected && "bg-blue-50\/70 after:scale-x-100"/);
});
