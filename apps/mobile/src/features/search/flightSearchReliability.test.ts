import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const api = readFileSync("src/api/travelApi.ts", "utf8");
const route = readFileSync("../../src/app/api/flights/search/route.ts", "utf8");

test("flight results bound LOS to JFK and every other request with abort and stale guards", () => {
  assert.match(screen, /new AbortController\(\)/);
  assert.match(screen, /activeSearch\.current\?\.abort\("superseded"\)/);
  assert.match(screen, /sequence === searchSequence\.current/);
  assert.match(screen, /if \(!isCurrent\(\)\) return/);
  assert.match(screen, /code === "cancelled"/);
  assert.match(screen, /Flight search took too long\. Please try again\./);
});

test("ready, empty, error, visible message, and clean retry remain terminal states", () => {
  assert.match(screen, /setStatus\(valid\.length \? "ready" : "empty"\)/);
  assert.match(screen, /setStatus\("error"\)/);
  assert.match(screen, /accessibilityRole="alert"/);
  assert.match(screen, /retry=\{\(\) => setRetry\(\(x\) => x \+ 1\)\}/);
  assert.match(screen, /const controller = new AbortController\(\)/);
});

test("request identity and the flight-specific hard timeout reach the backend", () => {
  assert.match(api, /"X-Search-Request-Id": options\.requestId/);
  assert.match(api, /FLIGHT_SEARCH_REQUEST_TIMEOUT_MS = 14_000/);
  assert.match(screen, /searchFlights\(plan\.plan\.payload, \{ signal: controller\.signal, requestId \}\)/);
  assert.match(screen, /controller\.abort\("ui-deadline"\)/);
  assert.match(screen, /deadlineExpired \|\|/);
  assert.match(route, /headers\.get\("x-search-request-id"\)/);
  assert.match(route, /requestId,/);
});

test("deadline, supersession, cleanup, and retry preserve latest-request ownership", () => {
  assert.match(screen, /const sequence = \+\+searchSequence\.current/);
  assert.match(screen, /if \(!isLatest\(\)\) return/);
  assert.match(screen, /searchSequence\.current \+= 1/);
  assert.match(screen, /activeSearch\.current\?\.abort\("screen-cleanup"\)/);
  assert.match(screen, /setRetry\(\(x\) => x \+ 1\)/);
  assert.match(screen, /const controller = new AbortController\(\)/);
});

test("loading decoration cannot intercept controls and route changes cannot loop requests", () => {
  assert.match(screen, /<View pointerEvents="none" style=\{s0\.loadingState\}>/);
  assert.doesNotMatch(screen, /\[product, JSON\.stringify\(params\)\]/);
  assert.match(screen, /\[product, plan\.plan\?\.key, retry, visualTest\]/);
  assert.match(screen, /activeSearch\.current\?\.abort\("edit-search"\)/);
  assert.match(screen, /activeSearch\.current\?\.abort\("screen-blur"\)/);
});

test("production parsing uses one native JSON path and safe response metadata", () => {
  assert.match(api, /parsed = await response\.json\(\)/);
  assert.doesNotMatch(api, /response\.text\(\)/);
  assert.doesNotMatch(api, /JSON\.parse\(raw\)/);
  assert.match(api, /response\.headers\.get\("content-length"\)/);
  assert.match(api, /TravelApiError\("The search provider returned an invalid response\.", response\.status, "invalid-response"\)/);
  assert.doesNotMatch(api, /error\.message.*JSON|JSON.*error\.message/);
});

test("slow flight diagnostics measure processing and event-loop responsiveness", () => {
  assert.match(api, /responseJsonMs/);
  assert.match(screen, /clientValidationMs/);
  assert.match(screen, /\[flight-search:event-loop\]/);
});

test("flight results virtualize cards and own exactly one saved-flight subscription", () => {
  const card = screen.slice(screen.indexOf("function FlightCard"), screen.indexOf("function FlightJourneyRow"));
  assert.match(screen, /<SectionList/);
  assert.match(screen, /stickySectionHeadersEnabled/);
  assert.match(screen, /initialNumToRender=\{6\}/);
  assert.doesNotMatch(screen, /sorted\.map\(\(x, i\) =>\s*product === "flight"/);
  assert.equal((screen.match(/useSavedFlights\(\)/g) || []).length, 1);
  assert.doesNotMatch(card, /useSavedFlights|savedRepository|readSession|SecureStore/);
  assert.match(card, /saved: boolean; onToggleSaved: \(\) => void/);
});

test("airline SVG isolation deterministically preserves the initials fallback", () => {
  const logo = readFileSync("src/features/search/AirlineLogo.tsx", "utf8");
  assert.match(logo, /allowRemoteSvg\?: boolean/);
  assert.match(logo, /isSvgUrl\(visibleUrl\) && !allowRemoteSvg/);
  assert.match(screen, /EXPO_PUBLIC_DISABLE_REMOTE_AIRLINE_SVG/);
});

test("Experiment B isolates SVG and raster airline images on iOS without changing Android", () => {
  const logo = readFileSync("src/features/search/AirlineLogo.tsx", "utf8");
  const policy = readFileSync("src/features/search/flightResultsAirlineImagePolicy.ts", "utf8");
  assert.match(logo, /!allowRemoteImages/);
  assert.match(screen, /allowRemoteImages=\{allowRemoteAirlineImages\}/);
  assert.match(policy, /return platform !== "ios"/);
});
