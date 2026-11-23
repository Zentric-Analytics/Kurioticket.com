import assert from "node:assert/strict";
import test from "node:test";
import { isKayakSandboxEnabled, KayakError, KayakSandboxClient } from "./kayakSandbox";

const hotel = { vertical: "hotels", destination: "kplace:58075", departure: "2099-12-16", returnDate: "2099-12-18", adults: 1 } as const;
const car = { vertical: "cars", origin: "BOS", departure: "2099-12-16", returnDate: "2099-12-18" } as const;
test("invalid environment, disabled integration and missing key fail closed", async () => {
  for (const env of [{}, { KAYAK_SANDBOX_ENABLED: "true" }, { KAYAK_SANDBOX_ENABLED: "true", KAYAK_SANDBOX_API_KEY: "   " }, { KAYAK_SANDBOX_ENABLED: "true", KAYAK_SANDBOX_API_KEY: "test", NEXT_PUBLIC_APP_URL: "https://unauthorized.example" }]) assert.equal(isKayakSandboxEnabled(env), false);
  let calls = 0;
  const client = new KayakSandboxClient("", (async () => { calls++; return Response.json({}); }) as typeof fetch);
  await assert.rejects(client.search(hotel, "test"), { code: "unauthorized" });
  assert.equal(calls, 0);
});
test("hotel/car authentication preserves actual client headers and fixed sandbox host", async () => {
  for (const search of [hotel, car]) {
    const requests: RequestInit[] = [];
    const client = new KayakSandboxClient("test-secret", (async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://sandbox-en-us.kayakaffiliates.com");
      assert.equal(url.searchParams.get("apiKey"), "test-secret");
      requests.push(init!);
      return Response.json(search.vertical === "hotels" ? { isComplete: true, currencyCode: "USD", totalFilteredResults: 0, results: [] } : { status: "complete", currency: "USD", priceMode: "total", results: [] });
    }) as typeof fetch, async () => {}, "HeadlessChrome/145", "192.0.2.1");
    assert.deepEqual(await client.search(search, "safe-test-track"), []);
    assert.equal(new Headers(requests[0].headers).get("user-agent"), "HeadlessChrome/145", "Never disguise the actual client agent to bypass provider rejection");
    assert.equal(new Headers(requests[0].headers).get("x-original-client-ip"), "192.0.2.1");
  }
});
test("401/403 status survives secret-free diagnostics; 429 and permanent errors are not retried", async () => {
  for (const search of [hotel, car]) for (const status of [401, 403, 429, 500]) {
    let calls = 0;
    const client = new KayakSandboxClient("test-secret", (async () => { calls++; return new Response("test-secret upstream private body", { status }); }) as typeof fetch, async () => {});
    await assert.rejects(client.search(search, "test"), error => {
      assert.ok(error instanceof KayakError);
      assert.equal(error.httpStatus, status);
      assert.equal(error.code, status === 429 ? "rate_limited" : status >= 500 ? "server_error" : "unauthorized");
      assert.doesNotMatch(error.message, /test-secret|private body/);
      if (status === 403) assert.match(error.message, /forbidden/);
      return true;
    });
    assert.equal(calls, search.vertical === "cars" && status >= 500 ? 2 : 1);
  }
});
