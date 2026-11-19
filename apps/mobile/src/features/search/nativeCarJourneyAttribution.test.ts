import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carResults = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
const nativeApi = readFileSync("src/api/travelApi.ts", "utf8");
const identity = readFileSync("src/features/privacy/visitorIdentityCoordinator.ts", "utf8");

test("native Car search receives the visitor identity and keeps its original response consent context", () => {
  assert.match(identity, /"\/api\/cars\/search"/);
  assert.match(nativeApi, /\["\/api\/flights\/search", "\/api\/hotels\/search", "\/api\/cars\/search", "\/api\/mobile\/v1\/hotels\/progressive"\]\.includes\(path\)/);
  assert.match(nativeApi, /rememberJourneyResponseContext\(data, requestVisitorContext\)/);
  assert.match(carResults, /journeyEvents\.rememberSearch\(response\.requestId,journeyResponseContext\(response\)\)/);
  assert.match(carResults, /setResultsRequestId\(response\.requestId\)/);
  assert.doesNotMatch(carResults, /rememberSearch\(requestId,/);
});

test("native Car results only record real displayed inventory, without tying display to a retry or account change", () => {
  assert.match(carResults, /setResultsRequestId\(undefined\);\s*setStatus\("loading"\)/);
  assert.match(carResults, /if\(status==="ready" && results\.length>0\) journeyEvents\.resultsViewed\(resultsRequestId,"\/car-results",results\.length\)/);
  assert.match(carResults, /canonicalResultsWereSilentlyLost\(acceptance\)/);
  assert.match(carResults, /controller\.signal\.aborted\|\|sequence!==searchSequence\.current/);
  assert.doesNotMatch(carResults, /AppState/);
  assert.doesNotMatch(carResults, /createVisitorToken|analytics: true/);
});
