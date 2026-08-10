import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Hotel, Flight, and Car details use the white guided journey page background", async () => {
  const source = await readFile(
    new URL("./DealsJourneyShell.tsx", import.meta.url),
    "utf8",
  );
  const backgroundRule = source.match(
    /const useDetailsBackground =([\s\S]*?);/,
  );
  assert.ok(backgroundRule);
  assert.deepEqual(
    [...backgroundRule[1].matchAll(/stage === "([^"]+)"/g)].map(
      ([, stage]) => stage,
    ),
    ["hotel-details", "flight-details", "car-details"],
  );
  for (const grayStage of [
    "hotel-results",
    "flight-results",
    "car-results",
    "review",
  ])
    assert.doesNotMatch(backgroundRule[1], new RegExp(grayStage));
  assert.doesNotMatch(
    backgroundRule[1],
    /stage\.(?:endsWith|includes|startsWith)\(/,
  );
  assert.match(
    source,
    /className=\{`flex-1 overflow-x-clip pb-12 \$\{[\s\S]*?useDetailsBackground \? "bg-white" : "bg-\[#f6f8fb\]"[\s\S]*?\}`\}/,
  );
  for (const attribute of [
    "data-deals-guided-journey",
    "data-deals-guided-stage",
    "data-deals-guided-plan-state",
  ])
    assert.match(source, new RegExp(attribute));
  assert.ok(
    source.indexOf("<DealsJourneyBreadcrumbs") <
      source.indexOf("<DealsJourneyProgress"),
  );
  assert.equal((source.match(/<DealsJourneyProgress/g) ?? []).length, 1);
  assert.match(
    source,
    /requiredStage === stage && stage === "hotel-details"[\s\S]*?<DealsHotelDetailsStage/,
  );
  assert.match(source, /<DealsFlightDetailsStage/);
  assert.match(source, /<DealsCarDetailsStage/);
});

test("guided shell uses breadcrumbs as primary navigation without changing shared Deals presentation", async () => {
  const source = await readFile(
    new URL("./DealsJourneyShell.tsx", import.meta.url),
    "utf8",
  );
  for (const component of [
    "DealsResultsSearchSummary",
    "DealsModifySearchDialog",
    "DealsJourneyBreadcrumbs",
    "DealsJourneyProgress",
  ])
    assert.match(source, new RegExp(`<${component}`));
  assert.equal((source.match(/<DealsJourneyProgress/g) ?? []).length, 1);
  assert.ok(
    source.indexOf("<DealsResultsSearchSummary") <
      source.indexOf("<DealsJourneyBreadcrumbs"),
  );
  assert.ok(
    source.indexOf("<DealsJourneyBreadcrumbs") <
      source.indexOf("<DealsJourneyProgress"),
  );
  assert.doesNotMatch(
    source,
    /deals\.guided\.back|ArrowLeft|getPreviousDealsJourneyStage|backHref/,
  );
  assert.match(source, /data-deals-guided-journey-foundation/);
  assert.equal((source.match(/<h1/g) ?? []).length, 1);
  assert.match(source, /<DealsHotelResultsStage search=\{search\} \/>/);
  for (const forbidden of [
    "DealsSearchForm",
    "/api/hotels",
    "/api/flights",
    "/api/cars",
    "bookingUrl",
    "partnerRedirectUrl",
    "/redirect",
    'target="_blank"',
  ])
    assert.doesNotMatch(source, new RegExp(forbidden));
});

test("Hotel, Flight, and Car results journey stages hide redundant shell headings without changing accessibility or focus", async () => {
  const source = await readFile(
    new URL("./DealsJourneyShell.tsx", import.meta.url),
    "utf8",
  );
  assert.equal((source.match(/<h1/g) ?? []).length, 1);
  assert.match(
    source,
    /const visuallyHideStageHeading =\s*stage === "hotel-results" \|\|\s*stage === "hotel-details" \|\|\s*stage === "flight-results" \|\|\s*stage === "flight-details" \|\|\s*stage === "car-results";/,
  );
  const hiddenStageRule = source.match(
    /const visuallyHideStageHeading =([\s\S]*?);/,
  );
  assert.ok(hiddenStageRule);
  assert.deepEqual(
    [...hiddenStageRule[1].matchAll(/stage === "([^"]+)"/g)].map(
      ([, stage]) => stage,
    ),
    [
      "hotel-results",
      "hotel-details",
      "flight-results",
      "flight-details",
      "car-results",
    ],
  );
  for (const visibleStage of ["car-details"])
    assert.doesNotMatch(hiddenStageRule[1], new RegExp(visibleStage));
  assert.doesNotMatch(
    hiddenStageRule[1],
    /stage\.(?:endsWith|includes|startsWith)\(/,
  );
  assert.match(
    source,
    /className=\{\s*visuallyHideStageHeading\s*\? "sr-only"\s*: "scroll-mt-24 text-balance text-2xl font-extrabold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-\[#004BB8\] sm:text-3xl"\s*\}/,
  );
  assert.match(
    source,
    /<h1\s+ref=\{headingRef\}\s+tabIndex=\{-1\}[\s\S]*?\{t\(`deals\.guided\.heading\.\$\{stage\}`\)\}[\s\S]*?<\/h1>/,
  );
  assert.match(
    source,
    /headingRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(source, /<DealsHotelResultsStage search=\{search\} \/>/);
  assert.match(source, /<DealsHotelDetailsStage/);
  assert.match(source, /<DealsFlightDetailsStage/);
  assert.match(source, /<DealsCarResultsStage search=\{search\} \/>/);
  assert.match(source, /<DealsCarDetailsStage/);
  const backgroundRule = source.match(
    /const useDetailsBackground =([\s\S]*?);/,
  );
  assert.ok(backgroundRule);
  assert.deepEqual(
    [...backgroundRule[1].matchAll(/stage === "([^"]+)"/g)].map(
      ([, stage]) => stage,
    ),
    ["hotel-details", "flight-details", "car-details"],
  );
  assert.ok(
    source.indexOf("<DealsJourneyBreadcrumbs") <
      source.indexOf("<DealsJourneyProgress"),
  );
  assert.equal((source.match(/<DealsJourneyProgress/g) ?? []).length, 1);
});
test("public Deals and package results contracts remain active", async () => {
  const [landing, results, handoff] = await Promise.all([
    readFile(new URL("../../../app/deals/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../../app/deals/handoff/page.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(landing, /<DealsSearchForm/);
  assert.doesNotMatch(landing, /deals\/journey/);
  assert.match(results, /buildDealsPackageCandidates/);
  assert.match(results, /stagedHotelJourneyActive/);
  assert.match(handoff, /DealsHandoffClient/);
});
test("server client boundaries are keyed by scope and search fingerprint, not stage", async () => {
  const [guided, results] = await Promise.all([
    readFile(
      new URL("../../../app/deals/journey/[stage]/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../../app/deals/results/page.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  for (const source of [guided, results]) {
    assert.match(source, /buildDealsSearchFingerprint\(search\)/);
    assert.match(source, /buildDealsPlanContextKey/);
    assert.match(source, /key=\{contextKey\}/);
  }
  assert.doesNotMatch(guided, /buildDealsPlanContextKey\([^\n]*stage/);
});

test("failed guided search navigation only restores the valid rendered plan", async () => {
  const source = await readFile(
    new URL("./DealsJourneyShell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /setTimeout\([\s\S]*?updateFailed[\s\S]*?10000\)/);
  assert.match(
    source,
    /if \(plan\?\.searchFingerprint === fingerprint\)\s*writeDealsStagedJourneyPlan\(plan\)/,
  );
  assert.doesNotMatch(
    source,
    /updateFailed[\s\S]{0,300}(?:createDealsTripPlan|updateDealsTripPlan)/,
  );
});

test("guided hotel confirmation creates only canonical validated base Trip Plan paths", async () => {
  const [source, helper] = await Promise.all([
    readFile(new URL("./DealsJourneyShell.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../../lib/deals/dealsFlightDetails.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(helper, /buildCarResultsUrl\(search\)/);
  assert.match(
    helper,
    /const resultsPath = validateDealsInternalPath\(buildDealsResultsUrl\(search\)\)/,
  );
  assert.match(
    helper,
    /const carsResultsPath = included\.car[\s\S]*validateDealsInternalPath\([\s\S]*buildCarResultsUrl\(search\),[\s\S]*"\/cars\/results"/,
  );
  assert.match(
    helper,
    /if \(!resultsPath \|\| \(included\.car && !carsResultsPath\)\) return null;/,
  );
  assert.match(
    helper,
    /createDealsTripPlan\(\{ mode: search\.mode, searchFingerprint: fingerprint, resultsPath, \.\.\.\(included\.car && carsResultsPath \? \{ carsResultsPath \} : \{\}\) \}/,
  );
  const baseCreation = source.slice(
    source.indexOf("if (!base)"),
    source.indexOf("const nextPlan = replaceDealsHotelSelection"),
  );
  assert.doesNotMatch(baseCreation, /\|\|\s*"\/deals\/results"/);
  assert.doesNotMatch(baseCreation, /\|\|\s*"\/cars\/results"/);
  assert.doesNotMatch(
    baseCreation,
    /validateDealsInternalPath\("\/cars\/results"/,
  );
  assert.ok(baseCreation.indexOf("writeDealsStagedJourneyPlan") === -1);
  assert.ok(baseCreation.indexOf("router.push") === -1);
});

test("confirmation failures retain details and Retry only restores real Confirm focus", async () => {
  const shellSource = await readFile(
    new URL("./DealsJourneyShell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(shellSource, /confirmation-read-failure/);
  assert.match(shellSource, /confirmation-persistence-failure/);
  assert.match(shellSource, /role="alert"/);
  assert.match(shellSource, /getDealsGuidedConfirmationActionId\(product\)/);
  assert.match(
    shellSource,
    /setConfirmationFailure\(null\)[\s\S]*\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.doesNotMatch(
    shellSource,
    /clearConfirmationFailure[\s\S]{0,250}attemptGuidedConfirmation/,
  );
});

test("safe plan states replace interactive stages with reachable recovery", async () => {
  const shellSource = await readFile(
    new URL("./DealsJourneyShell.tsx", import.meta.url),
    "utf8",
  );
  for (const state of [
    "storage-unavailable",
    "invalid",
    "fingerprint-mismatch",
    "expired",
  ])
    assert.match(shellSource, new RegExp(`displayPlanStatus === "${state}"`));
  assert.match(
    shellSource,
    /GuidedSafeState[\s\S]*onAction=\{restartCurrentPreview\}/,
  );
  assert.match(shellSource, /router\.replace/);
});
