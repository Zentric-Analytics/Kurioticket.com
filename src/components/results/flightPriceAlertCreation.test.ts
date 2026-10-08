import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
const control = readFileSync("src/components/results/FlightPriceAlertControl.tsx", "utf8");
const hotel = readFileSync("src/components/results/HotelPriceAlertControl.tsx", "utf8");

test("Flight Results passes unfiltered provider inventory into its one alert control", () => {
  assert.equal(results.match(/<FlightPriceAlertControl/g)?.length, 1);
  assert.match(results, /<FlightPriceAlertControl query=\{mobileFlightPriceAlertQuery\} results=\{providerResults\}/);
  assert.doesNotMatch(results, /results=\{filtered|results=\{sortedResults/);
});

test("Flight switch opens a target editor without creating an alert", () => {
  assert.match(control, /if \(next\) \{ openEditor\(surface\); return; \}/);
  assert.match(control, /setOpenSurface\(surface\)/);
  assert.match(control, /buildFlightPriceAlertPayload/);
  assert.doesNotMatch(control, /buildAutomaticFlightPriceAlertPayload/);
  assert.match(control, /Save price alert/);
  assert.match(control, /role="dialog"/);
});

test("Flight target editor exposes the approved defaults, bounds, prices and accessible slider", () => {
  assert.match(control, /FLIGHT_ALERT_DEFAULT_DROP_PERCENT/);
  assert.match(control, /min=\{FLIGHT_ALERT_MIN_DROP_PERCENT\} max=\{surface === "mobile" \? HOTEL_ALERT_MAX_DROP_PERCENT : FLIGHT_ALERT_MAX_DROP_PERCENT\} step=\{1\}/);
  assert.match(control, /aria-label="Price drop" aria-valuetext/);
  assert.match(control, />Current price</);
  assert.match(control, />Drops by</);
  assert.match(control, />Target price</);
});

test("Flight target save preserves canonical query and provider currency", () => {
  assert.match(control, /targetPrice: alertTarget,[\s\S]*currency: baseline\.currency,[\s\S]*query: alertQuery/);
  assert.match(control, /selectAutomaticFlightBaseline\(results, searchQuery\.currency\)/);
  assert.match(control, /\{ \.\.\.searchQuery, currency: baseline\.currency \}/);
});

test("Flight target records are preferred while active legacy automatic records remain pausable", () => {
  assert.match(control, /matchingTargetFlightPriceAlert\(alerts, alertQuery\)/);
  assert.match(control, /matchingFlightPriceAlertForControl\(alerts, alertQuery\)/);
  assert.match(control, /patchStatus\(activeAlert, "PAUSED"\)/);
  assert.match(control, /preservedPausedTarget/);
});

test("duplicate target creation reconciles authoritative active or paused records", () => {
  assert.match(control, /response\.status === 409 && body\.alert && targetFlightPriceAlertMatchesQuery/);
  assert.match(control, /body\.alert\.status === "PAUSED" \? await patchStatus\(body\.alert, "ACTIVE"\) : body\.alert/);
});

test("authoritative failures leave tracking unchanged and authentication preserves Results URL", () => {
  assert.match(control, /if \(!saved\) \{ showFeedback\("error-pause"\); return; \}/);
  assert.match(control, /\/auth\/signin\?callbackUrl=\$\{encodeURIComponent\(location\.pathname \+ location\.search\)\}/);
  assert.match(control, /aria-checked=\{tracking\}/);
});

test("Flight editor dismissal and stale request protections are explicit", () => {
  assert.match(control, /mutationRef/);
  assert.match(control, /requestRef/);
  assert.match(control, /event\.key === "Escape"/);
  assert.match(control, /document\.body\.style\.overflow = "hidden"/);
  assert.match(control, />Cancel</);
  assert.match(control, /\.current\?\.focus\(\)/);
});

test("Flight feedback is accessible and never claims tracking before save", () => {
  assert.match(control, /role=\{feedback\.startsWith\("error"\) \? "alert" : "status"\} aria-live="polite"/);
  assert.match(control, /Price alert saved/);
  assert.match(control, /Price alert paused/);
  assert.doesNotMatch(control, /Price tracking is on/);
});

test("desktop Flight alert restores the compact original blue treatment without helper copy", () => {
  assert.match(control, /hidden rounded-2xl border border-\[#CFE0F8\] bg-\[#EEF6FF\] px-4 py-2/);
  assert.match(control, /flex min-h-10 items-center justify-between gap-2/);
  assert.equal(control.slice(control.indexOf("const desktopEditor")).match(/Choose a target and we’ll notify you if the price drops\./g)?.length, 1);
});

test("Hotel alert implementation remains isolated from Flight target work", () => {
  assert.doesNotMatch(hotel, /FLIGHT_ALERT_|matchingTargetFlightPriceAlert|flightAlertDesiredPrice/);
});


test("desktop Flight Track Price uses the Hotel-style modal interaction", () => {
  assert.match(control, /const desktopDialogRef = useRef<HTMLDialogElement>\(null\)/);
  assert.match(control, /if \(openSurface !== "desktop"\) return;[\s\S]*dialog\.showModal\(\)/);
  assert.match(control, /document\.body\.style\.overflow = "hidden"/);
  assert.match(control, /desktopSwitchRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(control, /onCancel=\{\(event\) => \{[\s\S]*event\.preventDefault\(\);[\s\S]*closeEditor\(\)/);
  assert.match(control, /getBoundingClientRect\(\)[\s\S]*closeEditor\(\)/);
  assert.match(control, /backdrop:bg-slate-950\/50/);
  assert.doesNotMatch(
    control,
    /openSurface === "desktop" \? <div className="mt-4 grid max-w-xl/,
  );
});

 test("mobile Flight target uses Hotel's range while desktop keeps its original bounds", () => {
  assert.match(control, /HOTEL_ALERT_MAX_DROP_PERCENT/);
  assert.match(control, /surface === "mobile" \? HOTEL_ALERT_MAX_DROP_PERCENT : FLIGHT_ALERT_MAX_DROP_PERCENT/);
});
