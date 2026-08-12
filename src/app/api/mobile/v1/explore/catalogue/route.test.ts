import assert from "node:assert/strict";
import test from "node:test";

import { ExploreCatalogueUnavailableError } from "@/services/exploreCatalogueService";
import { createExploreCatalogueGet } from "./route";

const catalogue = {
  version: "2026-08-12T11:00:00.000Z",
  regions: [
    {
      id: "africa",
      name: "Africa",
      slug: "africa",
      destinations: [
        {
          id: "ng-lagos",
          name: "Lagos",
          country: "Nigeria",
          countryCode: "NG",
          primaryAirportCode: "LOS",
          airportCodes: ["LOS"],
          airportNames: ["Murtala Muhammed International Airport"],
          searchAliases: ["Lagos"],
          imageDestinationId: "ng-lagos",
          imageUrl: null,
          summary: "A coastal city with a vibrant cultural scene.",
          description: "Explore Lagos from its waterfronts to its creative districts.",
          highlights: ["Waterfront", "Arts", "Food"],
          relatedDestinationIds: [],
        },
      ],
    },
  ],
};

test("mobile Explore catalogue returns the public v1 data envelope", async () => {
  const GET = createExploreCatalogueGet(async () => catalogue);
  const response = await GET();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { data: catalogue });
});

test("mobile Explore catalogue returns 503 until the database catalogue is bootstrapped", async () => {
  const GET = createExploreCatalogueGet(async () => {
    throw new ExploreCatalogueUnavailableError();
  });
  const response = await GET();

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: {
      code: "EXPLORE_CATALOGUE_UNAVAILABLE",
      message: "Explore is temporarily unavailable.",
    },
  });
});

test("mobile Explore catalogue hides unexpected backend errors", async () => {
  const GET = createExploreCatalogueGet(async () => {
    throw new Error("postgres://secret-host/internal-detail");
  });
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const response = await GET();
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(payload, {
      error: {
        code: "EXPLORE_CATALOGUE_ERROR",
        message: "Unable to load Explore right now.",
      },
    });
    assert.equal(JSON.stringify(payload).includes("secret-host"), false);
  } finally {
    console.error = originalConsoleError;
  }
});
