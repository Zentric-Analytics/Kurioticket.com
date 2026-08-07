import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createDefaultDealsSearch } from "@/lib/deals/dealsSearchParams";
import {
  buildDealsJourneyUrl,
  getFirstDealsJourneyStage,
} from "@/lib/deals/dealsJourneyRoutes";

const form = readFileSync(
  new URL("./DealsSearchForm.tsx", import.meta.url),
  "utf8",
);
const en = readFileSync(
  new URL("../../lib/i18n/en.ts", import.meta.url),
  "utf8",
);

test("guided preview is query gated to the landing variant only", () => {
  assert.match(form, /const isLandingVariant = variant === "landing"/);
  assert.match(
    form,
    /isLandingVariant && params\.get\("guidedPreview"\) === "1"/,
  );
  assert.match(form, /const guidedPreviewPanel = guidedPreviewEnabled \?/);
  assert.doesNotMatch(
    form,
    /variant === "results"[\s\S]{0,200}guidedPreviewEnabled/,
  );
  assert.doesNotMatch(
    form,
    /guidedPreviewEnabled[\s\S]{0,200}variant === "results"/,
  );
});

test("guided preview copy is translated and truthful about status", () => {
  assert.match(
    en,
    /"deals\.guidedPreview\.description":[\s\S]{0,300}Hotel[\s\S]{0,300}Flight[\s\S]{0,300}Car[\s\S]{0,300}Review[\s\S]{0,300}handoff/i,
  );
  assert.match(
    en,
    /"deals\.guidedPreview\.availableCar":[\s\S]{0,300}results[\s\S]{0,300}filters[\s\S]{0,300}sorting[\s\S]{0,300}details[\s\S]{0,300}confirmation/i,
  );
  assert.doesNotMatch(
    en,
    /"deals\.guidedPreview\.description": "[^"]*still in progress/i,
  );
  for (const key of [
    "deals.guidedPreview.badge",
    "deals.guidedPreview.title",
    "deals.guidedPreview.description",
    "deals.guidedPreview.availableHotel",
    "deals.guidedPreview.availableFlight",
    "deals.guidedPreview.availableCar",
    "deals.guidedPreview.availableReview",
    "deals.guidedPreview.availableHandoff",
    "deals.guidedPreview.previewOnlyTitle",
    "deals.guidedPreview.previewOnlyPublicLaunch",
    "deals.guidedPreview.previewOnlyBooking",
    "deals.guidedPreview.action",
    "deals.guidedPreview.accessibleName",
  ]) {
    assert.match(form, new RegExp(`t\\("${key}"\\)`));
    assert.match(en, new RegExp(`"${key}":`));
  }
  assert.match(en, /Hotel results, room selection, details, and confirmation/);
  assert.match(
    en,
    /Flight results, filters, sorting, details, and confirmation/,
  );
  assert.match(en, /Car results, filters, sorting, details, and confirmation/);
  assert.match(en, /Trip Review with persisted opened-step progress/);
  assert.match(en, /Final booking-partner handoff/);
  assert.doesNotMatch(
    en,
    /Car results[^"\n]*(?:in progress|incomplete|unfinished)/i,
  );
});

test("normal submit remains on legacy Deals results and does not branch on preview", () => {
  const submit =
    form.match(
      /const submit = \(event: FormEvent\) => \{[\s\S]*?\n  \};/,
    )?.[0] ?? "";
  assert.match(submit, /if \(!validateCurrentDealsSearch\(\)\) return/);
  assert.match(submit, /if \(variant === "results" && onSubmitSearch\)/);
  assert.match(submit, /router\.push\(buildDealsResultsUrl\(search\)\)/);
  assert.doesNotMatch(
    submit,
    /buildDealsJourneyUrl|getFirstDealsJourneyStage|guidedPreview/,
  );
});

test("preview action uses shared validation and canonical guided route helpers", () => {
  const preview =
    form.match(/const previewGuidedJourney = \(\) => \{[\s\S]*?\n  \};/)?.[0] ??
    "";
  assert.match(preview, /if \(submitting \|\| pending\) return/);
  assert.match(preview, /if \(!validateCurrentDealsSearch\(\)\) return/);
  assert.match(preview, /getFirstDealsJourneyStage\(search\.mode\)/);
  assert.match(preview, /buildDealsJourneyUrl\(firstStage, search\)/);
  assert.match(preview, /setSubmitting\(true\)/);
  assert.match(preview, /start\(\)/);
  assert.match(preview, /router\.push\(destination\)/);
});

test("preview route helper starts each package mode at its owned first stage", () => {
  const expected = {
    "hotel-flight": "hotel-results",
    "hotel-flight-car": "hotel-results",
    "hotel-car": "hotel-results",
    "flight-car": "flight-results",
  } as const;
  for (const [mode, stage] of Object.entries(expected)) {
    const search = createDefaultDealsSearch();
    search.mode = mode as keyof typeof expected;
    const firstStage = getFirstDealsJourneyStage(search.mode);
    const href = buildDealsJourneyUrl(firstStage, search);
    const url = new URL(href, "https://example.test");
    assert.equal(firstStage, stage);
    assert.equal(url.pathname, `/deals/journey/${stage}`);
    assert.equal(url.searchParams.has("guidedPreview"), false);
    assert.equal(url.searchParams.has("hotelId"), false);
    assert.equal(url.searchParams.has("flightId"), false);
    assert.equal(url.searchParams.has("carId"), false);
  }
});

test("preview entry does not import or call guided storage shortcuts", () => {
  for (const forbidden of [
    "createDealsTripPlan",
    "replaceDealsHotelSelection",
    "replaceDealsFlightSelection",
    "replaceDealsCarSelection",
    "writeDealsStagedJourneyPlan",
    "writeDealsTripPlan",
    "removeDealsStagedJourneyPlan",
    "markDealsProviderOpened",
  ]) {
    assert.doesNotMatch(form, new RegExp(forbidden));
  }
});

test("preview panel and action keep accessibility contracts", () => {
  assert.match(
    form,
    /<section[\s\S]*aria-labelledby="deals-guided-preview-title"/,
  );
  assert.match(form, /aria-describedby="deals-guided-preview-description"/);
  assert.match(
    form,
    /aria-label=\{t\("deals\.guidedPreview\.accessibleName"\)\}/,
  );
  assert.equal((form.match(/<h1/g) ?? []).length, 0);
  assert.match(
    form,
    /<button[\s\S]*type="button"[\s\S]*disabled=\{submitting \|\| pending\}/,
  );
  assert.match(form, /min-h-11/);
});
