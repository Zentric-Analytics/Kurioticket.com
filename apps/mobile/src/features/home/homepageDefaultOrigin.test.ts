import assert from "node:assert/strict";
import test from "node:test";
import {
  canApplyHomepageDefaultOrigin,
  fetchHomepageDefaultOrigin,
  parseHomepageDefaultOrigin,
} from "./homepageDefaultOrigin";

const airport = { code: "LHR", city: "London", country: "United Kingdom", airport: "Heathrow Airport" };

test("a valid explicit default takes priority over ranked suggestions", () => {
  assert.deepEqual(parseHomepageDefaultOrigin({ defaultOriginAirport: airport, suggestions: [{ ...airport, code: "LGW" }] }), airport);
});

test("the first valid ranked suggestion is used when the explicit default is absent", () => {
  assert.deepEqual(parseHomepageDefaultOrigin({ defaultOriginAirport: null, suggestions: [null, { code: "x", city: "Bad", country: "Bad", airport: "Bad" }, airport] }), airport);
});

test("malformed endpoint responses do not produce an origin", () => {
  assert.equal(parseHomepageDefaultOrigin(null), null);
  assert.equal(parseHomepageDefaultOrigin({ suggestions: {} }), null);
  assert.equal(parseHomepageDefaultOrigin({ defaultOriginAirport: { ...airport, country: "" }, suggestions: [airport] }), null);
  assert.equal(parseHomepageDefaultOrigin({ suggestions: [{ ...airport, code: "LONG" }] }), null);
});

test("missing API configuration leaves the origin empty without fetching", async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  let calls = 0;
  try {
    assert.equal(await fetchHomepageDefaultOrigin(async () => { calls += 1; throw new Error("must not run"); }), null);
    assert.equal(calls, 0);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previous;
  }
});

test("the adapter calls only the public default-origin endpoint once", async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://example.test";
  const urls: string[] = [];
  try {
    const result = await fetchHomepageDefaultOrigin(async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ defaultOriginAirport: airport, suggestions: [] }));
    });
    assert.deepEqual(result, airport);
    assert.deepEqual(urls, ["https://example.test/api/flights/places?context=origin&default=true"]);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previous;
  }
});

test("request and JSON failures leave the origin empty", async () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://example.test";
  try {
    assert.equal(await fetchHomepageDefaultOrigin(async () => { throw new Error("offline"); }), null);
    assert.equal(await fetchHomepageDefaultOrigin(async () => new Response("bad json")), null);
    assert.equal(await fetchHomepageDefaultOrigin(async () => new Response("", { status: 503 })), null);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previous;
  }
});

test("automatic origin never outranks restored, route, tapped, or manually selected state", () => {
  assert.equal(canApplyHomepageDefaultOrigin(false, false, false), true);
  assert.equal(canApplyHomepageDefaultOrigin(true, false, false), false);
  assert.equal(canApplyHomepageDefaultOrigin(false, true, false), false);
  assert.equal(canApplyHomepageDefaultOrigin(false, false, true), false);
});
