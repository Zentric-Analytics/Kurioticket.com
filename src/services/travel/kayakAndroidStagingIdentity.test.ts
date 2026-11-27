import test from "node:test";
import assert from "node:assert/strict";
import { kayakProviderUserAgent } from "./kayakMetasearchProvider";
import { KayakSandboxClient, type KayakVertical } from "./kayakSandbox";
import type { KayakPhaseDiagnostic } from "./kayakRequestDiagnostics";

const staging = { NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com", TRAVEL_PROVIDER_MODE: "staging", KAYAK_SANDBOX_ENABLED: "true", KAYAK_SANDBOX_API_KEY: "synthetic-test-key" };
const android = ["okhttp/4.12.0", "Dalvik/2.1.0 (Linux; Android)", "KurioticketMobile/0.3.0 (Android; Native) OkHttp"];

for (const vertical of ["flights", "cars"] as const) test(`${vertical}: retained car or restored flight identity stays stable through polling and pages`, async () => {
  let calls = 0;
  const client = new KayakSandboxClient("synthetic-test-key", async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("userTrackId"), "synthetic-track");
    assert.equal(new Headers(init?.headers).get("user-agent"), vertical === "cars" ? "kayakaffiliateapp" : android[0]);
    assert.equal(new Headers(init?.headers).get("x-original-client-ip"), "192.0.2.10");
    if (++calls === 1) return Response.json({ status: "first-phase", searchId: "synthetic-search", cluster: "4" });
    return Response.json({ status: "complete", searchId: "synthetic-search", cluster: "4", totalCount: 2, pageSize: 1, currency: "USD", priceMode: "total",
      results: [{ id: `result-${calls}`, bookingOptions: [{ type: "regular", bookingUrl: "https://affiliates.kayak.com/sandbox-clickout", price: { price: 100 + calls }, displayPrice: { price: 100 + calls }, car: { brand: "Synthetic car" } }] }] });
  }, async () => {}, kayakProviderUserAgent(vertical, vertical === "cars" ? android[2] : android[0], staging), "192.0.2.10");
  const results = await client.search({ vertical, origin: "LAX", destination: "SFO", departure: "2099-12-25", returnDate: "2099-12-29", adults: 1 }, "synthetic-track");
  assert.equal(results.length, 2);
  assert.equal(calls, 3);
});

test("only Android cars select the authorized staging identity; flights remain restored in every environment", () => {
  for (const product of ["flights", "cars"] as KayakVertical[]) for (const agent of android) {
    assert.equal(kayakProviderUserAgent(product, agent, staging), product === "cars" ? undefined : agent);
    for (const env of [{}, { ...staging, TRAVEL_PROVIDER_MODE: "production" }, { ...staging, TRAVEL_PROVIDER_MODE: undefined },
      { ...staging, KAYAK_SANDBOX_ENABLED: "false" }, { ...staging, KAYAK_SANDBOX_API_KEY: "" },
      ...["https://kurioticket.com", "https://www.kurioticket.com", "http://staging.kurioticket.com", "https://staging.kurioticket.com:8443", "https://staging.kurioticket.com.evil.example", "https://user:pass@staging.kurioticket.com", "http://localhost:3000", "invalid"].map(NEXT_PUBLIC_APP_URL => ({ ...staging, NEXT_PUBLIC_APP_URL }))]) {
      assert.equal(kayakProviderUserAgent(product, agent, env), agent);
    }
  }
});

test("browser including Android Chrome, iOS, unknown clients and existing hotel selection stay unchanged", () => {
  for (const product of ["flights", "cars", "hotels"] as KayakVertical[]) {
    for (const agent of ["Mozilla/5.0 (Linux; Android 16) Chrome/145", "Kurioticket/6 CFNetwork/3896 Darwin/27", "unknown", android[2] + " extra"]) {
      assert.equal(kayakProviderUserAgent(product, agent, staging), agent);
    }
  }
  for (const env of [staging, {}, { ...staging, TRAVEL_PROVIDER_MODE: "production" }]) {
    assert.equal(kayakProviderUserAgent("hotels", android[0], env), undefined);
    assert.equal(kayakProviderUserAgent("hotels", android[1], env), undefined);
    assert.equal(kayakProviderUserAgent("hotels", android[2], env), android[2]);
  }
});

for (const vertical of ["flights", "cars"] as const) test(`${vertical}: configured identity preserves native diagnostics, IP/tracker and rejects 403 without switching`, async () => {
  const incoming = vertical === "flights" ? android[0] : android[2];
  const phases: KayakPhaseDiagnostic[] = [];
  let calls = 0;
  const client = new KayakSandboxClient("synthetic-test-key", async (input, init) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://sandbox-en-us.kayakaffiliates.com");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("user-agent"), vertical === "cars" ? "kayakaffiliateapp" : incoming);
    assert.equal(headers.get("x-original-client-ip"), "192.0.2.10");
    return new Response("synthetic rejection", { status: 403 });
  }, async () => {}, kayakProviderUserAgent(vertical, incoming, staging), "192.0.2.10", undefined, undefined, undefined,
  { incomingUserAgent: incoming, product: vertical, requestId: "00000000-0000-4000-8000-000000000001" }, event => phases.push(event));
  const search = vertical === "flights" ? { vertical, origin: "LAX", destination: "SFO", departure: "2099-12-25", returnDate: "2099-12-29", adults: 1 } : { vertical, origin: "LHR", departure: "2099-12-25", returnDate: "2099-12-29", pickupTime: "10:00", dropoffTime: "10:00" };
  await assert.rejects(client.search(search, "synthetic-track"), { code: "unauthorized", httpStatus: 403 });
  assert.equal(calls, 1);
  assert.ok(phases.length > 0);
  assert.ok(phases.every(p => p.incomingAgentKind === (vertical === "flights" ? "android_transport" : "android_application")));
});
