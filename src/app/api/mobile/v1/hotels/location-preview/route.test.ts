import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { getStaticHotelById } from "@/services/travel/staticHotelResults";
import { GET } from "./route";

const endpoint = "https://kurioticket.test/api/mobile/v1/hotels/location-preview";
const request = (query = "") => GET(new Request(`${endpoint}?${query}`));

test("validates a canonical Hotel id", async () => {
  assert.equal((await request()).status, 400);
  assert.equal((await request("id=unknown-hotel")).status, 404);
});

test("fails closed when the canonical Hotel has no usable coordinates", async () => {
  const hotel = getStaticHotelById("citizenm-paris-gare-de-lyon");
  assert.ok(hotel);
  const latitude = hotel.latitude;
  hotel.latitude = Number.NaN;
  try {
    assert.equal((await request("id=citizenm-paris-gare-de-lyon")).status, 503);
  } finally {
    hotel.latitude = latitude;
  }
});

test("returns an attributed cached PNG built from canonical coordinates", async () => {
  const originalFetch = globalThis.fetch;
  const tile = await sharp({ create: { width: 256, height: 256, channels: 4, background: "#DCE7D5" } }).png().toBuffer();
  const requested: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    requested.push(String(input));
    return new Response(new Uint8Array(tile), { status: 200, headers: { "Content-Type": "image/png" } });
  }) as typeof fetch;
  try {
    const response = await request("id=citizenm-paris-gare-de-lyon&latitude=0&longitude=0");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.match(response.headers.get("cache-control") ?? "", /s-maxage=86400/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(requested.length, 9);
    assert.ok(requested.every((url) => /^https:\/\/tile\.openstreetmap\.org\/15\//.test(url)));
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("settles to an unavailable response when the tile provider fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("unavailable", { status: 503 })) as typeof fetch;
  try {
    const response = await request("id=citizenm-paris-gare-de-lyon");
    assert.equal(response.status, 503);
    assert.equal(await response.text(), "Map preview unavailable.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
