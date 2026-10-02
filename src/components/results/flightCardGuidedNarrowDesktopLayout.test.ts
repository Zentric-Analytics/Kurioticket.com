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

test("desktop badge actions do not increase the itinerary header height", () => {
  assert.match(
    flightCardSource,
    /data-flight-card-header-actions[\s\S]*flight-card-header-actions/,
  );
  const flightCardDesktopMediaStart = globalsCss.indexOf(
    "@media (min-width: 1024px)",
    globalsCss.indexOf(".flight-card-desktop-brand"),
  );
  assert.notEqual(
    flightCardDesktopMediaStart,
    -1,
    "desktop Flight card media block exists",
  );
  assert.match(
    ruleBody(
      globalsCss,
      ".flight-card-header-actions",
      flightCardDesktopMediaStart,
    ),
    /position:\s*absolute[\s\S]*top:\s*0[\s\S]*right:\s*0[\s\S]*width:\s*196px/,
  );
  assert.match(
    ruleBody(
      globalsCss,
      ".flight-card-desktop-header",
      flightCardDesktopMediaStart,
    ),
    /padding-right:\s*196px/,
  );
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

test("desktop fare stays beside the itinerary while details span beneath both columns", () => {
  const baseBodyStart = globalsCss.indexOf(".flight-card-body {");
  assert.match(
    ruleBody(globalsCss, ".flight-card-body", baseBodyStart),
    /grid-template-columns:\s*minmax\(0, 1fr\) 196px/,
  );

  const finalDesktopStart = globalsCss.indexOf(
    "@media (min-width: 1024px)",
    globalsCss.indexOf("Keep the desktop fare column beside the itinerary"),
  );
  assert.ok(finalDesktopStart > baseBodyStart);

  const desktopBodyRule = ruleBody(
    globalsCss,
    ".flight-card-body",
    finalDesktopStart,
  );
  const desktopFareRule = ruleBody(
    globalsCss,
    ".flight-card-fare-action",
    finalDesktopStart,
  );
  assert.match(
    desktopBodyRule,
    /grid-template-areas:\s*"legs fare"\s*"details details"/,
  );
  assert.match(
    desktopBodyRule,
    /grid-template-columns:\s*minmax\(0, 1fr\) 196px/,
  );
  assert.match(desktopBodyRule, /row-gap:\s*0\.5rem/);
  assert.match(desktopFareRule, /align-items:\s*flex-end/);
  assert.match(desktopFareRule, /border-left:\s*1px solid #d8e1ec/);
  assert.match(desktopFareRule, /border-top:\s*0/);
  assert.match(desktopFareRule, /padding-left:\s*1rem/);
  assert.match(desktopFareRule, /padding-bottom:\s*0/);
  assert.match(desktopFareRule, /text-align:\s*right/);

  const desktopCommerceRule = ruleBody(
    globalsCss,
    ".flight-card-fare-commerce",
    finalDesktopStart,
  );
  const desktopPriceFrameRule = ruleBody(
    globalsCss,
    ".flight-card-price-frame",
    finalDesktopStart,
  );
  const desktopViewRule = ruleBody(
    globalsCss,
    ".flight-card-view-button",
    finalDesktopStart,
  );
  assert.match(desktopCommerceRule, /width:\s*auto/);
  assert.match(desktopCommerceRule, /margin-left:\s*auto/);
  assert.match(desktopCommerceRule, /align-items:\s*flex-end/);
  assert.match(desktopPriceFrameRule, /width:\s*auto/);
  assert.match(desktopPriceFrameRule, /margin-left:\s*auto/);
  assert.match(desktopPriceFrameRule, /text-align:\s*right/);
  assert.match(desktopViewRule, /width:\s*auto/);
  assert.match(desktopViewRule, /min-height:\s*1\.5rem/);
  assert.match(desktopViewRule, /margin-top:\s*0\.375rem/);
  assert.match(desktopViewRule, /align-self:\s*flex-end/);

  const mediumQueryStart = globalsCss.indexOf(
    "@container (max-width: 759px)",
    finalDesktopStart,
  );
  const mediumDesktopStart = globalsCss.indexOf(
    "@media (min-width: 1024px)",
    mediumQueryStart,
  );
  const mediumBodyRule = ruleBody(
    globalsCss,
    ".flight-card-body",
    mediumDesktopStart,
  );
  assert.match(
    mediumBodyRule,
    /grid-template-columns:\s*minmax\(0, 1fr\) 180px/,
  );
  assert.match(
    mediumBodyRule,
    /grid-template-areas:\s*"legs fare"\s*"details details"/,
  );
  assert.doesNotMatch(flightCardSource, /flight-card-details[^\n]*grid-cols-3/);
});

test("phone and tablet lower card is a two-column decision area", () => {
  const mobileStart = globalsCss.indexOf(
    "@media (max-width: 1023px)",
    globalsCss.indexOf("The approved desktop FlightCard hierarchy"),
  );
  const mobileRules = globalsCss.slice(mobileStart, globalsCss.indexOf(".flight-results-grid", mobileStart));
  const bodyRule = ruleBody(mobileRules, ".flight-card-body");
  assert.match(bodyRule, /grid-template-areas:\s*"legs legs" "details fare"/);
  assert.match(bodyRule, /minmax\(0, 1\.2fr\) minmax\(120px, 0\.8fr\)/);
  assert.match(bodyRule, /column-gap:\s*0/);
  assert.match(bodyRule, /row-gap:\s*0\.625rem/);

  const detailsRule = ruleBody(
    mobileRules,
    ".flight-card-details",
    mobileRules.indexOf(".flight-card-view-button"),
  );
  assert.match(detailsRule, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(detailsRule, /align-content:\s*start/);
  assert.match(mobileRules, /white-space:\s*normal/);
  assert.match(mobileRules, /overflow-wrap:\s*anywhere/);

  const fareRule = ruleBody(mobileRules, ".flight-card-fare-action");
  assert.match(fareRule, /align-items:\s*center/);
  assert.match(fareRule, /text-align:\s*center/);
  assert.match(fareRule, /border-top:\s*1px solid #d8e1ec/);
  assert.match(detailsRule, /border-top:\s*1px solid #d8e1ec/);
  assert.match(
    ruleBody(mobileRules, ".flight-card-price-frame"),
    /align-items:\s*center/,
  );
  assert.match(
    ruleBody(
      mobileRules,
      '[data-flight-results-experience="deals-guided"] .flight-card-fare-action',
    ),
    /display:\s*flex[\s\S]*align-items:\s*center[\s\S]*text-align:\s*center/,
  );

  const extraNarrowRules = globalsCss.slice(
    globalsCss.indexOf("@media (max-width: 359px)"),
    globalsCss.indexOf(".flight-results-grid", globalsCss.indexOf("@media (max-width: 359px)")),
  );
  assert.match(
    ruleBody(extraNarrowRules, ".flight-card-body"),
    /column-gap:\s*0/,
  );
});

test("desktop utility actions occupy the top-right header without reserving a missing badge slot", () => {
  const headerStart = flightCardSource.indexOf("data-flight-card-header-actions");
  const bodyStart = flightCardSource.indexOf("flight-card-body", headerStart);
  const header = flightCardSource.slice(headerStart, bodyStart);
  const fareCallStart = flightCardSource.indexOf("<FlightFareAction", bodyStart);
  const fareCallEnd = flightCardSource.indexOf("/>", fareCallStart);
  const fareCall = flightCardSource.slice(fareCallStart, fareCallEnd);
  const actionStart = flightCardSource.indexOf("function FlightFareAction");
  const actionEnd = flightCardSource.indexOf("function FlightDetailLines", actionStart);
  const fareAction = flightCardSource.slice(actionStart, actionEnd);

  assert.match(header, /\{resultBadge \? <ResultBadgePill badge=\{resultBadge\} \/> : null\}/);
  assert.match(header, /renderFlightUtilityActions\("hidden lg:flex"\)/);
  assert.match(header, /flex shrink-0 flex-col items-end gap-1/);
  assert.doesNotMatch(header, /\{resultBadge \? \(\s*<div[\s\S]*data-flight-card-header-actions/);

  assert.match(fareCall, /actions=\{renderFlightUtilityActions\("lg:hidden"\)\}/);
  assert.match(fareAction, /data-flight-card-fare-actions/);
  assert.match(fareAction, /mb-1 flex w-full justify-end lg:hidden/);
  assert.match(fareAction, /justify-start/);

  const controls = fareAction.indexOf("{actions}");
  const price = fareAction.indexOf("{formattedPrice}");
  const viewDeal = fareAction.indexOf("{viewFlightLabel}");
  assert.ok(controls >= 0 && controls < price, "tablet utility controls remain before the fare price");
  assert.ok(price >= 0 && price < viewDeal, "Fare price renders before View deal");
});

test("desktop badge cards reserve enough header height for stacked badge and utility actions", () => {
  assert.match(
    flightCardSource,
    /resultBadge && "lg:min-h-16"/,
  );
  const headerStart = flightCardSource.indexOf("flight-card-desktop-header");
  const bodyStart = flightCardSource.indexOf("flight-card-body", headerStart);
  const header = flightCardSource.slice(headerStart, bodyStart);
  assert.match(header, /resultBadge && "lg:min-h-16"/);
});


test("price and View Flight retain their semantic order without provider-price clutter", () => {
  const actionStart = flightCardSource.indexOf("function FlightFareAction");
  const action = flightCardSource.slice(actionStart, flightCardSource.indexOf("function FlightDetailLines", actionStart));
  const price = action.indexOf("{formattedPrice}");
  const button = action.indexOf("{viewFlightLabel}");
  assert.ok(price >= 0 && price < button);
  assert.doesNotMatch(action, /\{priceLabel\}/);
  assert.doesNotMatch(action, /flight-card-provider-price/);
  assert.match(action, /min-h-9/);
  const priceRule = ruleBody(
    globalsCss,
    '.flight-card-price-value.flight-card-price[data-price-size="normal"]',
  );
  assert.match(priceRule, /font-size:\s*1\.1875rem/);
  assert.match(
    ruleBody(globalsCss, ".flight-card-price-value.flight-card-price"),
    /white-space:\s*nowrap/,
  );
  assert.match(
    globalsCss,
    /flight-card-price-value\.flight-card-price\[data-price-size="large"\]/,
  );
  assert.match(
    globalsCss,
    /flight-card-price-value\.flight-card-price\[data-price-size="compact"\]/,
  );
  assert.doesNotMatch(flightCardSource, /showProviderHandoffCopy|flightCardProviderHandoff|flight-card-handoff/);
});

test("all three detail lines share the left-side details region", () => {
  assert.equal(flightCardSource.match(/<FlightDetailLines details={details}/g)?.length, 1);
  assert.match(flightCardSource, /label: t\("baggage"\)[\s\S]*label: t\("cabin"\)[\s\S]*label: t\("fareRules"\)/);
  assert.match(ruleBody(globalsCss, ".flight-card-details"), /grid-area:\s*details/);
});

test("desktop detail strip uses balanced transparent metadata columns with mobile icon parity", () => {
  const detailsStart = flightCardSource.indexOf("function FlightDetailLines");
  const details = flightCardSource.slice(detailsStart);
  const desktopStart = globalsCss.indexOf(
    "@media (min-width: 1024px)",
    globalsCss.indexOf(".flight-card-detail-value"),
  );
  const desktopDetailsRule = ruleBody(
    globalsCss,
    ".flight-card-details",
    desktopStart,
  );
  const desktopItemRule = ruleBody(
    globalsCss,
    ".flight-card-detail-item",
    desktopStart,
  );
  const desktopDividerRule = ruleBody(
    globalsCss,
    ".flight-card-detail-item + .flight-card-detail-item::before",
    desktopStart,
  );
  const desktopIconRule = ruleBody(
    globalsCss,
    ".flight-card-detail-icon",
    desktopStart,
  );
  const desktopValueRule = ruleBody(
    globalsCss,
    ".flight-card-detail-value",
    desktopStart,
  );

  assert.match(details, /flight-card-detail-value min-w-0/);
  assert.doesNotMatch(details, /truncate|line-clamp|overflow-hidden/);
  assert.match(desktopDetailsRule, /grid-template-columns:\s*repeat\(3, max-content\)/);
  assert.match(desktopDetailsRule, /align-items:\s*center/);
  assert.match(desktopDetailsRule, /border:\s*0/);
  assert.match(desktopDetailsRule, /border-radius:\s*0/);
  assert.match(desktopDetailsRule, /justify-content:\s*start/);
  assert.match(desktopDetailsRule, /column-gap:\s*1\.5rem/);
  assert.doesNotMatch(desktopDetailsRule, /space-between/);
  assert.match(desktopDetailsRule, /background:\s*transparent/);
  assert.match(desktopDetailsRule, /margin-top:\s*0/);
  assert.match(desktopDetailsRule, /padding:\s*0\.5rem 0/);

  assert.match(desktopItemRule, /grid-template-columns:\s*1rem max-content minmax\(0, 1fr\)/);
  assert.match(desktopItemRule, /min-height:\s*1\.5rem/);
  assert.match(desktopItemRule, /padding:\s*0/);
  assert.match(desktopItemRule, /border:\s*0/);
  assert.doesNotMatch(desktopItemRule, /border-inline-end/);
  const edgeItemRule = ruleBody(
    globalsCss,
    ".flight-card-detail-item:first-child,",
    desktopStart,
  );
  assert.match(edgeItemRule, /padding:\s*0/);
  assert.match(edgeItemRule, /border:\s*0/);

  assert.match(desktopDividerRule, /content:\s*none/);

  assert.match(details, /flight-card-detail-icon h-3\.5 w-3\.5 shrink-0 text-slate-500/);
  assert.match(desktopIconRule, /width:\s*1rem/);
  assert.match(desktopIconRule, /height:\s*1rem/);
  assert.match(desktopIconRule, /padding:\s*0/);
  assert.match(desktopIconRule, /border-radius:\s*0/);
  assert.match(desktopIconRule, /background:\s*transparent/);
  assert.match(desktopIconRule, /color:\s*#64748b/);

  assert.match(desktopValueRule, /white-space:\s*nowrap/);
});

test("result-card fare rule stays concise and leaves provider terms to details", () => {
  assert.match(
    flightCardSource,
    /label: t\("fareRules"\),\s*value: t\("checkProvider"\)/,
  );
  assert.doesNotMatch(flightCardSource, /flight\.fareTerms|flight\.refundInfo/);
  assert.doesNotMatch(flightCardSource, /getFlightResultFareRule/);
});

test("FlightCard retains fare pricing inputs and Next Link behavior", () => {
  assert.match(flightCardSource, /FlightFareAction/);
  assert.match(flightCardSource, /detailsHref/);
  assert.match(flightCardSource, /viewFlightLabel/);
  assert.match(flightCardSource, /viewFlightAriaLabel/);
  assert.match(flightCardSource, /formattedPrice/);
  assert.match(flightCardSource, /providerPrice/);
  assert.match(flightCardSource, /<Link[\s\S]*href=\{detailsHref\}/);
});

test("desktop fare action omits the visible provider price label", () => {
  const fareAction = flightCardSource.slice(
    flightCardSource.indexOf("function FlightFareAction"),
    flightCardSource.indexOf("function FlightDetailLines"),
  );

  assert.doesNotMatch(fareAction, /priceLabel|providerPriceLabel|showConvertedProviderPrice/);
  assert.doesNotMatch(fareAction, /<p[^>]*>\s*\{priceLabel\}\s*<\/p>/);
});


test("narrow desktop fare price and View deal share the same right edge", () => {
  const narrowContainerStart = globalsCss.indexOf("@container (max-width: 759px)");
  const baseViewButtonRule = ruleBody(
    globalsCss,
    ".flight-card-view-button",
    narrowContainerStart,
  );
  const desktopOverrideStart = globalsCss.indexOf(
    "@media (min-width: 1024px)",
    globalsCss.indexOf(".flight-card-view-button", narrowContainerStart),
  );
  const desktopViewButtonRule = ruleBody(
    globalsCss,
    ".flight-card-view-button",
    desktopOverrideStart,
  );
  const farePriceRule = ruleBody(
    globalsCss,
    ".flight-card-fare-action .flight-card-price-value",
  );

  assert.match(baseViewButtonRule, /padding-right:\s*0\.875rem/);
  assert.match(baseViewButtonRule, /min-width:\s*108px/);
  assert.match(desktopViewButtonRule, /padding-right:\s*0/);
  assert.match(farePriceRule, /text-align:\s*right/);
});
