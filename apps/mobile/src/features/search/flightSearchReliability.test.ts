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

test("slow flight diagnostics measure parsing, processing, and event-loop responsiveness", () => {
  assert.match(api, /responseBytes: responseByteLength\(raw\)/);
  assert.match(api, /textDecodeMs/);
  assert.match(api, /jsonParseMs/);
  assert.match(screen, /clientValidationMs/);
  assert.match(screen, /\[flight-search:event-loop\]/);
});
