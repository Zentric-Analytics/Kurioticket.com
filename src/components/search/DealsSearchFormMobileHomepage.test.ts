import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");
const compactStart = form.indexOf("const mobileHomepagePackageOptions");
const compactEnd = form.indexOf("const dealsPackageOptions", compactStart);
const options = form.slice(compactStart, compactEnd);
const controlsStart = form.indexOf("const mobileHomepageControls");
const controlsEnd = form.indexOf("\n  return (", controlsStart);
const compact = form.slice(controlsStart, controlsEnd);

test("mobile homepage exposes exactly four canonical package modes in visible order", () => {
  assert.match(form, /presentation\?: "default" \| "mobile-homepage"/);
  const expected = [
    ['hotel-flight', 'Flight + Hotel'],
    ['flight-car', 'Flight + Car'],
    ['hotel-car', 'Hotel + Car'],
    ['hotel-flight-car', 'Flight + Hotel + Car'],
  ];
  let previous = -1;
  for (const [mode, label] of expected) {
    const declaration = `{ mode: "${mode}", text: "${label}" }`;
    const index = options.indexOf(declaration);
    assert.ok(index > previous, `${label} should map to ${mode} in order`);
    previous = index;
  }
  assert.equal((options.match(/\{ mode:/g) ?? []).length, 4);
  assert.match(compact, /mobileHomepagePackageOptions\.map/);
  assert.match(compact, /data-deals-mode=\{mode\}/);
  assert.match(compact, /selectPackageMode\(mode\)/);
  assert.match(form, /transitionDealsMode\(current, mode\)/);
});

test("mobile package selector is a compact, nowrap horizontal rail", () => {
  assert.match(compact, /mobile-homepage-deals-package-rail/);
  for (const utility of ["flex-nowrap", "overflow-x-auto", "overscroll-x-contain", "[-webkit-overflow-scrolling:touch]", "[&::-webkit-scrollbar]:hidden"]) {
    assert.ok(compact.includes(utility), `rail should include ${utility}`);
  }
  assert.match(compact, /h-10 shrink-0 snap-start/);
  assert.match(compact, /text-\[13px\]/);
  assert.match(compact, /<span className="whitespace-nowrap">\{text\}<\/span>/);
  assert.doesNotMatch(compact.slice(0, compact.indexOf("Origin")), /truncate|text-overflow|ellipsis/);
  assert.match(form, /presentation === "mobile-homepage"/);
  assert.match(form, /mobileHomepageControls \?\? <>/);
  assert.match(form, /data-deals-package-selector-variant=\{variant\}/);
});

test("selection stays visible and keyboard navigation reaches every package", () => {
  assert.match(form, /scrollIntoView\(\{[\s\S]*?block: "nearest",[\s\S]*?inline: "nearest"/);
  assert.match(compact, /ArrowRight/);
  assert.match(compact, /ArrowLeft/);
  assert.match(compact, /event\.key === "Home"/);
  assert.match(compact, /event\.key === "End"/);
  assert.match(compact, /role="radiogroup"/);
  assert.match(compact, /role="radio" aria-checked=\{selected\} aria-label=\{text\}/);
});

test("compact controls reuse canonical pickers, summary, validation and submission", () => {
  assert.match(compact, /openFlightDates/);
  assert.match(compact, /openTravelers/);
  assert.match(compact, /travelerSummary/);
  assert.match(form, /validateDealsSearch\(candidate\)/);
  assert.match(form, /buildDealsJourneyUrl\([\s\S]*?getFirstDealsJourneyStage/);
  assert.match(form, /removeDealsStagedJourneyPlan\(\)/);
});
