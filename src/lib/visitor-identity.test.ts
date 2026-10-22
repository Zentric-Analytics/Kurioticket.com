import assert from "node:assert/strict";
import test from "node:test";

import {
  createVisitorToken,
  hashVisitorToken,
  isSameOriginRequest,
  isNativeVisitorRequest,
  readVisitorToken,
  visitorCookieName,
  visitorTrackingDenied,
} from "./visitor-identity";
import { visitorDenialCookieName } from "./visitor-consent-constants";

test("visitor tokens are opaque, stable for hashing, and never accepted when malformed", () => {
  const token = createVisitorToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(hashVisitorToken(token), hashVisitorToken(token));
  assert.notEqual(hashVisitorToken(token), token);
  assert.equal(readVisitorToken(new Request("https://kurioticket.com", { headers: { cookie: `${visitorCookieName}=not-a-token` } })), null);
});

test("native identities use only their explicit header and never inherit web cookies", () => {
  const browserToken = createVisitorToken();
  const nativeToken = createVisitorToken();
  const request = new Request("https://kurioticket.com/api/hotels/search", {
    headers: { cookie: `${visitorCookieName}=${browserToken}`, "x-mobile-platform": "ios", "x-kt-visitor": nativeToken },
  });
  assert.equal(isNativeVisitorRequest(request), true);
  assert.equal(readVisitorToken(request), nativeToken);
  assert.equal(readVisitorToken(request, "web"), browserToken);
  assert.equal(readVisitorToken(new Request(request.url, { headers: { cookie: `${visitorCookieName}=${browserToken}`, authorization: "Bearer invalid" } })), null);
  assert.equal(readVisitorToken(new Request(request.url, { headers: { cookie: `${visitorCookieName}=${browserToken}`, "x-mobile-platform": "android", "x-kt-visitor": "malformed" } })), null);
});

test("unmarked browser requests cannot select a native identity by supplying its token header", () => {
  const token = createVisitorToken();
  const request = new Request("https://kurioticket.com", { headers: { "x-kt-visitor": token } });
  assert.equal(readVisitorToken(request), null);
  assert.equal(readVisitorToken(request, "native"), token);
});

test("browser opt-out suppresses tracking without hiding the credential needed to retry withdrawal", () => {
  const token = createVisitorToken();
  const cookie = `${visitorCookieName}=${token}; ${visitorDenialCookieName}=1`;
  const request = new Request("https://kurioticket.com", { headers: { cookie } });
  assert.equal(visitorTrackingDenied(request), true);
  assert.equal(readVisitorToken(request), token);
  assert.equal(visitorTrackingDenied(new Request(request.url, { headers: { cookie: `${visitorDenialCookieName}=10` } })), false);
  const nativeRequest = new Request(request.url, { headers: { cookie, "x-mobile-platform": "ios", "x-kt-visitor": token } });
  assert.equal(visitorTrackingDenied(nativeRequest), false);
  assert.equal(visitorTrackingDenied(request, "native"), false);
  assert.equal(visitorTrackingDenied(nativeRequest, "web"), true, "explicit browser endpoints always honor browser denial");
});

test("visitor cookie parsing only returns the first-party visitor token", () => {
  const token = createVisitorToken();
  const request = new Request("https://kurioticket.com/api/identity/visitor", {
    headers: { cookie: `theme=dark; ${visitorCookieName}=${token}; session=secret` },
  });

  assert.equal(readVisitorToken(request), token);
});

test("identity mutations reject cross-origin browser requests", () => {
  assert.equal(isSameOriginRequest(new Request("https://kurioticket.com/api/identity/visitor", { headers: { origin: "https://kurioticket.com" } })), true);
  assert.equal(isSameOriginRequest(new Request("https://kurioticket.com/api/identity/visitor", { headers: { origin: "https://attacker.example" } })), false);
  assert.equal(isSameOriginRequest(new Request("https://kurioticket.com/api/identity/visitor", { headers: { "sec-fetch-site": "cross-site" } })), false);
});
