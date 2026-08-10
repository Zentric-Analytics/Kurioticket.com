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
const flightResultsSource = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
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
const narrowQueryEnd = globalsCss.indexOf(
  "\n.flight-results-grid",
  narrowQueryStart,
);
const narrowRules = globalsCss.slice(narrowQueryStart, narrowQueryEnd);
const guidedSelector = '[data-flight-results-experience="deals-guided"]';

test("FlightCard retains its container-responsive desktop architecture", () => {
  assert.match(flightCardSource, /flight-card-desktop-shell hidden lg:block/);
  assert.match(
    ruleBody(globalsCss, ".flight-card-desktop-shell"),
    /container-type:\s*inline-size/,
  );
  assert.notEqual(narrowQueryStart, -1, "narrow container query exists");
});

test("wide and medium desktop cards retain their side fare columns", () => {
  assert.match(
    ruleBody(globalsCss, ".flight-card-desktop-itinerary"),
    /grid-template-columns:\s*minmax\(0, 1fr\) 184px/,
  );
  const mediumQueryStart = globalsCss.indexOf("@container (max-width: 759px)");
  assert.match(
    ruleBody(globalsCss, ".flight-card-desktop-itinerary", mediumQueryStart),
    /grid-template-columns:\s*minmax\(0, 1fr\) 168px/,
  );
  assert.match(
    ruleBody(globalsCss, ".flight-card-details"),
    /column-gap:\s*1rem/,
  );
  assert.match(flightCardSource, /flight-card-details[^\n]*grid-cols-3/);
});

test("guided narrow cards integrate fare information and action full width", () => {
  assert.match(
    flightResultsSource,
    /data-flight-results-experience="deals-guided"/,
  );
  assert.ok(narrowRules.includes(guidedSelector));

  const fareRule = ruleBody(
    narrowRules,
    `${guidedSelector} .flight-card-fare-action`,
  );
  assert.match(fareRule, /display:\s*grid/);
  assert.match(fareRule, /width:\s*100%/);
  assert.match(fareRule, /grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(fareRule, /justify-self:\s*stretch/);
  assert.match(fareRule, /border-left-width:\s*0/);
  assert.match(fareRule, /border-top:\s*1px solid #d8e1ec/);
  assert.doesNotMatch(fareRule, /justify-self:\s*end/);
  assert.doesNotMatch(fareRule, /width:\s*min\(176px, 100%\)/);

  const priceRule = ruleBody(
    narrowRules,
    `${guidedSelector} .flight-card-price-frame`,
  );
  assert.match(priceRule, /align-items:\s*flex-start/);
  assert.match(priceRule, /text-align:\s*left/);
  assert.match(
    ruleBody(narrowRules, `${guidedSelector} .flight-card-provider-price`),
    /text-align:\s*left/,
  );
});

test("guided narrow footer wraps into two columns with full-row fare rules", () => {
  const detailsRule = ruleBody(
    narrowRules,
    `${guidedSelector} .flight-card-details`,
  );
  assert.match(
    detailsRule,
    /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
  );

  const itemRule = ruleBody(
    narrowRules,
    `${guidedSelector} .flight-card-detail-item {`,
  );
  assert.match(itemRule, /white-space:\s*normal/);
  assert.match(itemRule, /align-items:\s*flex-start/);

  const secondItemRule = ruleBody(
    narrowRules,
    ".flight-card-detail-item:nth-child(2)",
  );
  assert.match(secondItemRule, /border-inline-end-width:\s*0/);

  const thirdItemRule = ruleBody(
    narrowRules,
    ".flight-card-detail-item:nth-child(3)",
  );
  assert.match(thirdItemRule, /grid-column:\s*1 \/ -1/);
  assert.match(thirdItemRule, /border-inline-end-width:\s*0/);
  assert.match(thirdItemRule, /border-top:\s*1px solid #eef2f7/);
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
