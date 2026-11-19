import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("Car handoff rejects headerless and cross-origin posts before cache or writes", () => {
  const browserGuard = route.indexOf('!origin || !isSameOriginRequest(request)');
  const fetchSiteGuard = route.indexOf('request.headers.get("sec-fetch-site") !== "same-origin"');
  const cacheRead = route.indexOf('getProviderResult<NormalizedCarResult>("car", body.resultId)');
  const persist = route.indexOf("await recordProviderHandoffActivity(request,");
  assert.ok(browserGuard > 0 && fetchSiteGuard > browserGuard);
  assert.ok(cacheRead > fetchSiteGuard && persist > cacheRead);
  assert.match(route, /import \{ isSameOriginRequest \} from "@\/lib\/visitor-identity"/);
});

test("Car handoff rate limits and bounds requests before provider lookup", () => {
  assert.match(route, /checkRateLimit\(\x60car-handoff:ip:/);
  assert.match(route, /checkRateLimit\("car-handoff:global"/);
  assert.match(route, /status: 429/);
  assert.match(route, /readBoundedJsonBody\(request, 2048\)/);
  assert.match(route, /handoffTrackingId\(body\.handoffId\)/);
  assert.ok(route.indexOf('readBoundedJsonBody(request, 2048)') < route.indexOf('getProviderResult<NormalizedCarResult>("car", body.resultId)'));
});

test("Car handoff correlation uses validated UUID and server-owned offer", () => {
  assert.match(route, /handoffTrackingId\(body\.requestId\)/);
  assert.match(route, /car\.offers\.find\(item => item\.id === body\.offerId\)/);
  assert.match(route, /recordProviderHandoffActivity\(request,/);
});
