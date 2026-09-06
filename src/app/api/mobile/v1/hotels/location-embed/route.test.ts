import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

const endpoint = "https://kurioticket.test/api/mobile/v1/hotels/location-embed";
const request = (query = "") => GET(new Request(`${endpoint}?${query}`));

test("validates only a known Hotel id and supported view", () => {
  assert.equal(request("view=map").status, 400);
  assert.equal(request("id=citizenm-paris-gare-de-lyon&view=terrain").status, 400);
  assert.equal(request("id=unknown-hotel&view=map").status, 404);
});

test("returns hardened Google Map and Street View wrapper documents", async () => {
  const previous = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = "fake-test-key";
  try {
    for (const [view, path] of [["map", "/maps/embed/v1/place"], ["streetview", "/maps/embed/v1/streetview"]] as const) {
      const response = request(`id=citizenm-paris-gare-de-lyon&view=${view}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
      assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
      assert.match(response.headers.get("content-security-policy") ?? "", /frame-src https:\/\/www\.google\.com/);
      assert.match(await response.text(), new RegExp(path));
    }
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = previous;
  }
});

test("ignores arbitrary location parameters and fails closed without configuration", async () => {
  const previous = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  try {
    const response = request("id=citizenm-paris-gare-de-lyon&view=map&latitude=0&longitude=0&address=evil&url=https://evil.test");
    assert.equal(response.status, 503);
    assert.equal(await response.text(), "Map preview unavailable.");
  } finally {
    if (previous !== undefined) process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = previous;
  }
});

test("caller-supplied coordinates, address, and URL cannot alter the trusted Hotel", async () => {
  const previous = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = "fake-test-key";
  try {
    const response = request("id=citizenm-paris-gare-de-lyon&view=map&latitude=0&longitude=0&address=Attacker&url=https://evil.test");
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.doesNotMatch(body, /Attacker|evil\.test|center=0%2C0/);
    assert.match(body, /citizenM\+Paris\+Gare\+de\+Lyon/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = previous;
  }
});
