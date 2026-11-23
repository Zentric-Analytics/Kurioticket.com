import assert from "node:assert/strict";
import test from "node:test";

import { publicVisitorIp, resolveIpinfoLiteCountryContext } from "./ipinfo";

test("search country lookup never falls back to the origin server's /me location", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.IPINFO_TOKEN;
  const calls: string[] = [];
  process.env.IPINFO_TOKEN = "integration-test-only";
  globalThis.fetch = async (input) => {
    const uri = String(input);
    calls.push(uri);
    if (uri.includes("/me?")) return Response.json({ country_code: "US", country: "United States" });
    return new Response(null, { status: 403 });
  };
  try {
    const strict = await resolveIpinfoLiteCountryContext("8.8.8.8", { allowMeFallback: false });
    assert.equal(strict, null, "403 cannot become the server's country");
    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/8\.8\.8\.8\?/);
    assert.ok(!calls[0].includes("/me?"));

    calls.length = 0;
    const ordinary = await resolveIpinfoLiteCountryContext("8.8.8.8");
    assert.equal(ordinary?.countryCode, "US", "preserve existing /api/location fallback behavior");
    assert.equal(calls.length, 2, "existing /me fallback is unchanged for non-search callers");
    assert.match(calls[1], /\/me\?/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.IPINFO_TOKEN;
    else process.env.IPINFO_TOKEN = originalToken;
  }
});

test("only routable ingress IPs are candidates for search country lookup", () => {
  assert.equal(publicVisitorIp("8.8.8.8"), "8.8.8.8");
  assert.equal(publicVisitorIp("10.0.0.1"), null);
  assert.equal(publicVisitorIp("203.0.113.5"), null);
  assert.equal(publicVisitorIp("not-an-ip"), null);
});
