import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCarLocationSuggestions,
  parseFlightPlaceSuggestions,
  searchFlightPlaces,
} from "./locationSuggestions";

const originalBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
test.afterEach(() => {
  process.env.EXPO_PUBLIC_API_BASE_URL = originalBaseUrl;
});

test("flight client passes query, context, and AbortSignal", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://mobile.example.test";
  const controller = new AbortController();
  let requested = "";
  let signal: AbortSignal | null | undefined;
  await searchFlightPlaces(" Lagos ", {
    context: "destination",
    signal: controller.signal,
    fetcher: async (url, init) => {
      requested = String(url);
      signal = init?.signal;
      return new Response(JSON.stringify({ suggestions: [] }));
    },
  });
  assert.equal(
    requested,
    "https://mobile.example.test/api/flights/places?context=destination&q=Lagos",
  );
  assert.equal(signal, controller.signal);
});

test("location parsers skip malformed and duplicate suggestions", () => {
  assert.deepEqual(
    parseFlightPlaceSuggestions({
      suggestions: [
        { code: "los", city: "Lagos", airport: "Murtala Muhammed" },
        { code: "LOS", city: "Duplicate", airport: "Duplicate" },
        { code: "12", city: "Bad", airport: "Bad" },
      ],
    }),
    [{ code: "LOS", city: "Lagos", airport: "Murtala Muhammed" }],
  );
  assert.deepEqual(
    parseCarLocationSuggestions({
      suggestions: [
        {
          id: "city-ng-lagos",
          kind: "city",
          value: "Lagos, Nigeria",
          primaryText: "Lagos",
          secondaryText: "Nigeria",
        },
        {
          id: "custom-x",
          kind: "custom",
          value: "x",
          primaryText: "Use x",
          secondaryText: "Unverified",
        },
      ],
    }).map(({ id }) => id),
    ["city-ng-lagos"],
  );
  assert.throws(
    () => parseCarLocationSuggestions({ suggestions: null }),
    /Invalid car location response/,
  );
});
