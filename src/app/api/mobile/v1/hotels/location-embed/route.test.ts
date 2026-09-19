import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";
import { rememberHotels } from "@/lib/searchCache";
import type { NormalizedHotelResult } from "@/lib/types";

const endpoint = "https://kurioticket.test/api/mobile/v1/hotels/location-embed";
const request = (query = "") => GET(new Request(`${endpoint}?${query}`));

test("validates only a known Hotel id and supported view", async () => {
  assert.equal((await request("view=map")).status, 400);
  assert.equal((await request("id=citizenm-paris-gare-de-lyon&view=terrain")).status, 400);
  assert.equal((await request("id=unknown-hotel&view=map")).status, 404);
});

test("returns hardened Google Map and Street View wrapper documents", async () => {
  const previous = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = "fake-test-key";
  try {
    for (const [view, path] of [["map", "/maps/embed/v1/place"], ["streetview", "/maps/embed/v1/streetview"]] as const) {
      const response = await request(`id=citizenm-paris-gare-de-lyon&view=${view}`);
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

test("provider Hotel ids reuse the same hardened Map and Street View wrapper", async () => {
  const id = `kayak-sandbox:map-${Date.now()}`;
  rememberHotels([{
    id,
    provider: "KAYAK sandbox",
    name: "Provider Map Hotel",
    rating: 0,
    location: "10 Test Street",
    amenities: [],
    roomType: "Room",
    cancellationInfo: "See supplied rate details",
    pricePerNight: 100,
    totalPrice: 200,
    currency: "USD",
    bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
    partnerRedirectUrl: "https://affiliates.kayak.com/sandbox-clickout",
    valueScore: 0,
    travelConfidenceScore: 0,
    arrivalSuitabilityScore: 0,
    recommendationReasons: [],
    badges: [],
    dataSource: "demo",
    rawProviderReference: {
      kind: "kayak-hotel-details",
      details: { source: "KAYAK", overview: { address: "10 Test Street", countryCode: "US" } },
      location: { address: "10 Test Street", countryCode: "US", latitude: 40.75, longitude: -73.98 },
    },
  } satisfies NormalizedHotelResult]);

  const previous = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = "fake-test-key";
  try {
    const response = await request(`id=${encodeURIComponent(id)}&view=streetview&latitude=0&longitude=0&address=Attacker`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /\/maps\/embed\/v1\/streetview/);
    assert.match(body, /location=40\.75%2C-73\.98/);
    assert.doesNotMatch(body, /Attacker|location=0%2C0/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = previous;
  }
});

test("ignores arbitrary location parameters and fails closed without configuration", async () => {
  const previous = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  try {
    const response = await request("id=citizenm-paris-gare-de-lyon&view=map&latitude=0&longitude=0&address=evil&url=https://evil.test");
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
    const response = await request("id=citizenm-paris-gare-de-lyon&view=map&latitude=0&longitude=0&address=Attacker&url=https://evil.test");
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.doesNotMatch(body, /Attacker|evil\.test|center=0%2C0/);
    assert.match(body, /citizenM\+Paris\+Gare\+de\+Lyon/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = previous;
  }
});
