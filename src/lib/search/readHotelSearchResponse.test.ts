import test from "node:test";
import assert from "node:assert/strict";
import { readHotelSearchResponse } from "./readHotelSearchResponse";

const message = "Hotel search is temporarily unavailable. Please retry.";
test("unsupported options ask for a changed search rather than claiming no availability", async () => {
  await assert.rejects(readHotelSearchResponse(Response.json({ results: [], status: "unavailable", warningCategory: "unsupported_search" }), message, undefined, "Change search options"), { message: "Change search options" });
});
for (const [name, response] of [
  ["gateway HTML", new Response("<!DOCTYPE html><title>502</title>", { status: 502 })],
  ["invalid successful JSON", new Response("not JSON")],
  ["missing results", Response.json({})],
  ["provider outage", Response.json({ results: [], warningCategory: "provider_unavailable" })],
  ["unavailable search contract", Response.json({ results: [], status: "unavailable" })],
  ["server error", Response.json({ error: "private diagnostic" }, { status: 500 })],
] as const) {
  test(`sanitizes ${name}`, async () => {
    await assert.rejects(readHotelSearchResponse(response, message), { message });
  });
}
test("preserves valid results and empty successful searches", async () => {
  for (const results of [[], [{ id: "hotel-1" }]]) {
    assert.deepEqual(await readHotelSearchResponse(Response.json({ results }), message), { results });
  }
});
