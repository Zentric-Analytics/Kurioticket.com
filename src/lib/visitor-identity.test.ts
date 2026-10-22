import assert from "node:assert/strict";
import test from "node:test";

import {
  createVisitorToken,
  hashVisitorToken,
  isSameOriginRequest,
  readVisitorToken,
  visitorCookieName,
} from "./visitor-identity";

test("visitor tokens are opaque, stable for hashing, and never accepted when malformed", () => {
  const token = createVisitorToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(hashVisitorToken(token), hashVisitorToken(token));
  assert.notEqual(hashVisitorToken(token), token);
  assert.equal(readVisitorToken(new Request("https://kurioticket.com", { headers: { cookie: `${visitorCookieName}=not-a-token` } })), null);
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
});
