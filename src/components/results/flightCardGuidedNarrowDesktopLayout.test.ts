import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

const globalsCss = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);
const flightCardSource = readFileSync(
  new URL("./FlightCard.tsx", import.meta.url),
  "utf8",
);

function ruleBody(source: string, selector: string, from = 0) {
  const selectorStart = source.indexOf(selector, from);
  assert.notEqual(selectorStart, -1, `${selector} rule exists`);
  const bodyStart = source.indexOf("{", selectorStart);
  const bodyEnd = source.indexOf("}", bodyStart);
  assert.notEqual(bodyStart, -1, `${selector} rule opens`);
  assert.notEqual(bodyEnd, -1, `${selector} rule closes`);
  return source.slice(bodyStart + 1, bodyEnd);
}

const narrowQueryStart = globalsCss.indexOf("@container (max-width: 639px)");

test("FlightCard shares one container-responsive hierarchy at every width", () => {
  assert.match(flightCardSource, /className="flight-card-desktop-shell"/);
  assert.doesNotMatch(flightCardSource, /const mobileCard/);
  assert.doesNotMatch(flightCardSource, /flight-card-desktop-shell hidden/);
  assert.doesNotMatch(flightCardSource, /flightOption/);
  assert.equal(
    flightCardSource.match(/visibleLegs\.map/g)?.length,
    1,
    "all viewports render legs from one map",
  );
  assert.match(
    ruleBody(globalsCss, ".flight-card-desktop-shell"),
    /container-type:\s*inline-size/,
  );
  assert.notEqual(narrowQueryStart, -1, "narrow container query exists");
});

test("shared card keeps airline, badge, itinerary, details, price, and action", () => {
  assert.match(flightCardSource, /<AirlineLogo flight={flight}/);
  assert.match(flightCardSource, /<ResultBadgePill badge={resultBadge}/);
  assert.match(flightCardSource, /<ResponsiveFlightLegRow/);
  assert.match(flightCardSource, /<FlightDetailLines details={details}/);
  assert.match(flightCardSource, /providerPrice/);
  assert.match(flightCardSource, /viewFlightLabel/);
  assert.doesNotMatch(flightCardSource, /seatSelection/);
});

test("mobile card navigation ignores nested controls and keeps canonical href", () => {
  assert.match(flightCardSource, /max-width: 1023px/);
  assert.match(flightCardSource, /closest\("a, button, input, select, textarea"\)/);
  assert.match(flightCardSource, /router\.push\(resolvedDetailsHref\)/);
  assert.match(
    flightCardSource,
    /`\/flights\/details\/\$\{encodeURIComponent\(flight\.id\)\}`/,
  );
});

test("wide and medium desktop cards retain their side fare columns", () => {
  assert.match(
    ruleBody(globalsCss, ".flight-card-body"),
    /grid-template-columns:\s*minmax\(0, 1fr\) 196px/,
  );
  const mediumQueryStart = globalsCss.indexOf("@container (max-width: 759px)");
  assert.match(
    ruleBody(globalsCss, ".flight-card-body", mediumQueryStart),
    /grid-template-columns:\s*minmax\(0, 1fr\) 180px/,
  );
  assert.match(globalsCss, /\.flight-card-details \{\n  column-gap:\s*1rem/);
  assert.match(flightCardSource, /flight-card-details[^\n]*grid-cols-3/);
});

test("phone and tablet lower card is a two-column decision area", () => {
  const mobileStart = globalsCss.indexOf(
    "@media (max-width: 1023px)",
    globalsCss.indexOf("The approved desktop FlightCard hierarchy"),
  );
  const mobileRules = globalsCss.slice(mobileStart, globalsCss.indexOf(".flight-results-grid", mobileStart));
  const bodyRule = ruleBody(mobileRules, ".flight-card-body");
  assert.match(bodyRule, /grid-template-areas:\s*"legs legs" "fare details"/);
  assert.match(bodyRule, /minmax\(112px, 0\.85fr\) minmax\(0, 1\.15fr\)/);

  const detailsRule = ruleBody(mobileRules, ".flight-card-details");
  assert.match(detailsRule, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(detailsRule, /align-content:\s*start/);
  assert.match(mobileRules, /white-space:\s*normal/);
  assert.match(mobileRules, /overflow-wrap:\s*anywhere/);
});

test("price, provider label, and View Flight retain their semantic order", () => {
  const actionStart = flightCardSource.indexOf("function FlightFareAction");
  const action = flightCardSource.slice(actionStart, flightCardSource.indexOf("function FlightDetailLines", actionStart));
  const price = action.indexOf("{formattedPrice}");
  const label = action.indexOf("{priceLabel}");
  const button = action.indexOf("{viewFlightLabel}");
  assert.ok(price >= 0 && price < label && label < button);
  assert.match(action, /min-h-11/);
  assert.doesNotMatch(flightCardSource, /showProviderHandoffCopy|flightCardProviderHandoff|flight-card-handoff/);
});

test("all three detail lines share the right-side details region", () => {
  assert.equal(flightCardSource.match(/<FlightDetailLines details={details}/g)?.length, 1);
  assert.match(flightCardSource, /label: t\("baggage"\)[\s\S]*label: t\("cabin"\)[\s\S]*label: t\("fareRules"\)/);
  assert.match(ruleBody(globalsCss, ".flight-card-details"), /grid-area:\s*details/);
});

test("FlightCard retains fare pricing inputs and LinkButton behavior", () => {
  assert.match(flightCardSource, /FlightFareAction/);
  assert.match(flightCardSource, /detailsHref/);
  assert.match(flightCardSource, /viewFlightLabel/);
  assert.match(flightCardSource, /viewFlightAriaLabel/);
  assert.match(flightCardSource, /formattedPrice/);
  assert.match(flightCardSource, /providerPrice/);
  assert.match(flightCardSource, /<LinkButton/);
});
