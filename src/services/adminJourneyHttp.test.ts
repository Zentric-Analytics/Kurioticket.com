import assert from "node:assert/strict";
import test from "node:test";
import { createAdminJourneyService } from "./adminJourneyCore";
import { createAdminJourneyHttpHandlers } from "./adminJourneyHttp";

const now = new Date("2026-10-22T12:00:00Z");
function handlers(authorized: boolean) {
  return createAdminJourneyHttpHandlers(createAdminJourneyService({
    authorize: async () => authorized, database: () => null, environment: () => "staging", now: () => now,
  }));
}
const request = (query = "") => new Request(`https://staging.kurioticket.com/api/admin/journeys${query}`);

test("all journey GET adapters reject unauthenticated or non-admin callers without cacheable responses", async () => {
  const h = handlers(false);
  for (const response of [await h.list(request()), await h.summary(request()), await h.detail(request(), { params: Promise.resolve({ id: "journey-001" }) })]) {
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { status: "forbidden" });
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("vary"), "Cookie, Authorization");
  }
});

test("GET validation errors are 400 while unavailable storage is 503 with no fake empty data", async () => {
  const h = handlers(true);
  assert.equal((await h.list(request("?limit=1000"))).status, 400);
  assert.equal((await h.summary(request("?limit=10"))).status, 400);
  assert.equal((await h.detail(request(), { params: Promise.resolve({ id: "invalid!" }) })).status, 400);
  const response = await h.list(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "unavailable" });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
