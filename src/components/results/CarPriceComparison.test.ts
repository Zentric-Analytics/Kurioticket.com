import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const card = readFileSync(new URL("./CarResultCard.tsx", import.meta.url), "utf8");
const comparison = readFileSync(new URL("./CarPriceComparison.tsx", import.meta.url), "utf8");
const desktop = card.slice(card.indexOf('data-region="heading"'));
const specs = desktop.slice(
  desktop.indexOf("data-car-card-desktop-primary-specs"),
  desktop.indexOf('data-region="pricing"'),
);

test("standalone desktop owns exactly four required primary specifications", () => {
  for (const value of ["car.passengers", "car.bags", "car.doors", "car.transmission"]) {
    assert.match(card, new RegExp(value.replace(".", "\\.")));
  }
  assert.match(specs, /guidedPlanning \? specifications : desktopStandaloneSpecifications/);
  assert.match(card, /guidedPlanning && car\.airConditioning/);
  assert.doesNotMatch(specs, /Air conditioning|Snowflake/);
});

test("static comparison is truthful, local, and capability driven", () => {
  assert.match(card, /displayName: car\.sandboxPresentation \? .*KAYAK sandbox.* : t\("carsResults\.comparison\.estimateName"\)/);
  assert.match(card, /priceStatus: "estimate"/);
  assert.match(card, /bookable: false/);
  assert.match(card, /handoffAvailable: false/);
  assert.doesNotMatch(card, /approvedUrl:|bookingUrl/);
  assert.doesNotMatch(comparison, /href=|<Link|window\.open|router\./);
  assert.doesNotMatch(comparison, /Kurioticket static fixture|>Provider<|>Book<|>Reserve<|>View deal</);
});

test("clean static summary hides source, estimate, total, and coming-soon chrome", () => {
  assert.match(comparison, /cleanStaticSummary = false/);
  assert.match(
    comparison,
    /!cleanStaticSummary \? \([\s\S]*?\{labels\.source\}[\s\S]*?\{labels\.estimate\}[\s\S]*?\{estimate\.totalDisplay\}[\s\S]*?\{labels\.total\}/,
  );
  assert.match(
    comparison,
    /cleanStaticSummary \? \([\s\S]*?text-\[19px\] font-bold leading-none tabular-nums[\s\S]*?\{estimate\.perDayDisplay\}[\s\S]*?\{labels\.perDay\}/,
  );
  assert.match(
    comparison,
    /<p className="mt-1 text-\[11px\] font-medium text-slate-600" dir="ltr">[\s\S]*?\{estimate\.perDayDisplay\} \{labels\.perDay\}/,
  );
  assert.match(comparison, /\{expanded \? labels\.hidePrices : labels\.comparePrices\}/);
  assert.match(
    comparison,
    /!cleanStaticSummary \? <p[^>]*>\{labels\.liveDealsComingSoon\}<\/p> : null/,
  );
  assert.match(card, /cleanStaticSummary=\{!car\.sandboxPresentation\}/);
});

test("desktop comparison toggles one stable result-owned panel accessibly", () => {
  assert.match(comparison, /useState\(false\)/);
  assert.match(comparison, /aria-expanded=\{expanded\}/);
  assert.match(comparison, /aria-controls=\{panelId\}/);
  assert.match(comparison, /id=\{panelId\}/);
  assert.match(comparison, /resultId\.replace/);
  assert.match(comparison, /setExpanded\(\(current\) => !current\)/);
  assert.match(comparison, /disabled aria-label=\{labels\.notBookable\}/);
});

test("standalone desktop no longer exposes its details CTA while guided selection remains", () => {
  assert.match(desktop, /!guidedPlanning \? \(/);
  assert.match(desktop, /<CarPriceComparison/);
  const standaloneComparison = desktop.slice(
    desktop.indexOf("!guidedPlanning ? ("),
    desktop.indexOf(") : (", desktop.indexOf("!guidedPlanning ? (")),
  );
  assert.doesNotMatch(standaloneComparison, /detailsHref|<Link|onSelect/);
  assert.match(desktop, /onClick=\{\(\) => onSelect\(car\)\}/);
  assert.match(desktop, /href=\{detailsHref\}/);
});
