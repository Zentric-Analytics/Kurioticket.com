import assert from "node:assert/strict";
import test from "node:test";
import { nativeTravelApiHarness } from "./testsupport/travelApiHarness";

const requestId = "78e1de9e-6dfe-494f-9fdb-83726d83bf64";
const eventId = "78e1de9e-6dfe-494f-9fdb-83726d83bf65";
const token = "A".repeat(43);
const base = "https://staging.kurioticket.com";

for (const platform of ["android", "ios"]) {
  test(`${platform}: package results use their server search ID and initiating Visitor generation`, async () => {
    const response = { requestId, components: {}, packageOffers: [], status: "empty" };
    const h = nativeTravelApiHarness(platform, "0.3.0", base, async (url) => {
      if (url.endsWith("/packages/search")) return Response.json(response);
      return Response.json({ accepted: true }, { status: 202 });
    }, { visitor: { headers: async () => ({ "x-kt-visitor": token }), trackingContext: () => 7 } });
    const completed = await h.api.searchPackages({}, { requestId: eventId });
    assert.deepEqual(h.journeyContexts, [7]);
    assert.equal(h.journeyResponses[0], completed);
    assert.equal(completed.requestId, requestId);
    assert.equal(new Headers(h.calls[0].init.headers).get("x-mobile-platform"), platform);
    assert.equal(new Headers(h.calls[0].init.headers).get("x-kt-visitor"), token);
    assert.equal(new Headers(h.calls[0].init.headers).get("x-kt-search-session"), null);

    await h.api.pageView({ eventId, pageKey: "package_results", requestId: completed.requestId }, { visitorContext: 7 });
    assert.equal(new Headers(h.calls[1].init.headers).get("x-mobile-platform"), platform);
    assert.deepEqual(JSON.parse(String(h.calls[1].init.body)), { eventId, pageKey: "package_results", requestId });
  });
}

test("optional native transport requires the actual consented Visitor header", async () => {
  const h = nativeTravelApiHarness("android", "0.3.0", base, undefined, {
    visitor: { headers: async () => ({}), trackingContext: () => 7 },
  });
  await assert.rejects(h.api.pageView({ eventId, pageKey: "home" }, { visitorContext: 7 }), { code: "cancelled" });
  assert.equal(h.calls.length, 0);
});

test("optional native transport abandons an event when the account changes during Visitor lookup", async () => {
  let release!: (headers: Record<string, string>) => void;
  let start!: () => void;
  const lookup = new Promise<void>(resolve => { start = resolve; });
  const h = nativeTravelApiHarness("ios", "0.3.0", base, undefined, {
    visitor: {
      headers: () => new Promise(resolve => { release = resolve; start(); }),
      trackingContext: () => 7,
    },
  });
  const pending = h.api.pageView({ eventId, pageKey: "home" }, { visitorContext: 7 });
  await lookup;
  h.setSession({ user: { id: "other-account" }, token: "other-session" });
  release({ "x-kt-visitor": token });
  await assert.rejects(pending, { code: "cancelled" });
  assert.equal(h.calls.length, 0);
});
