import assert from "node:assert/strict";
import test from "node:test";
import { inbound, outbound } from "./dealsTripPlanV2.test";
import {
  DEALS_FLIGHT_RUNTIME_STORAGE_KEY,
  parseDealsFlightRuntimeV2,
  readDealsFlightRuntimeV2,
  clearDealsFlightRuntimeV2,
  writeDealsFlightRuntimeV2,
  type DealsFlightRuntimeV2,
} from "./dealsFlightRuntimeStorageV2";

const token = "inventory_capability_12345678901234567890";
const runtime = (
  tripType: "round-trip" | "one-way" = "round-trip",
): DealsFlightRuntimeV2 => ({
  version: 1,
  inventoryToken: token,
  sourceSearchKey: "search-key",
  inventoryExpiresAt: new Date(20_000).toISOString(),
  tripType,
  outboundChoices: [outbound],
  returnChoices: tripType === "round-trip" ? [inbound] : [],
  fareChoices: [
    {
      fareKey: "flight-fare-v3:safe",
      cabinClass: "economy",
      sourcePrice: 100,
      sourceCurrency: "USD",
    },
  ],
  selectedOutboundKey: outbound.itineraryKey,
  ...(tripType === "round-trip"
    ? { selectedReturnKey: inbound.itineraryKey }
    : {}),
  selectedFareKey: "flight-fare-v3:safe",
});

test("restores valid round-trip and one-way tab runtime", () => {
  for (const tripType of ["round-trip", "one-way"] as const)
    assert.deepEqual(
      parseDealsFlightRuntimeV2(
        JSON.stringify(runtime(tripType)),
        "search-key",
        tripType,
        10_000,
      ),
      runtime(tripType),
    );
});

test("discards malformed, expired, and stale-search state", () => {
  assert.equal(
    parseDealsFlightRuntimeV2("{", "search-key", "round-trip", 1),
    null,
  );
  assert.equal(
    parseDealsFlightRuntimeV2(
      JSON.stringify(runtime()),
      "search-key",
      "round-trip",
      20_000,
    ),
    null,
  );
  assert.equal(
    parseDealsFlightRuntimeV2(
      JSON.stringify(runtime()),
      "different",
      "round-trip",
      1,
    ),
    null,
  );
});

test("parses strict v2 fare-brand state and enforces selected option integrity", () => {
  const branded: DealsFlightRuntimeV2 = {
    ...runtime(),
    version: 2,
    fareBrandOptions: [
      {
        brandOptionKey: "flight-brand-v1:a",
        fareBrandName: "Flex",
        ownerNames: ["Air"],
        indicativeFromPrice: 120,
        indicativeCurrency: "USD",
      },
    ],
    selectedBrandOptionKey: "flight-brand-v1:a",
  };
  assert.deepEqual(
    parseDealsFlightRuntimeV2(
      JSON.stringify(branded),
      "search-key",
      "round-trip",
      1,
    ),
    branded,
  );
  assert.equal(
    parseDealsFlightRuntimeV2(
      JSON.stringify({
        ...branded,
        selectedBrandOptionKey: "flight-brand-v1:missing",
      }),
      "search-key",
      "round-trip",
      1,
    ),
    null,
  );
  assert.equal(
    parseDealsFlightRuntimeV2(
      JSON.stringify({
        ...branded,
        fareBrandOptions: [
          { ...branded.fareBrandOptions![0], providerOfferId: "off_secret" },
        ],
      }),
      "search-key",
      "round-trip",
      1,
    ),
    null,
  );
  assert.equal(
    parseDealsFlightRuntimeV2(
      JSON.stringify({
        ...branded,
        tripType: "one-way",
        returnChoices: [],
        selectedReturnKey: undefined,
      }),
      "search-key",
      "one-way",
      1,
    ),
    null,
  );
});

test("accepts a customer-safe Brand without cabin and rejects unsupported runtime cabins", () => {
  const branded: DealsFlightRuntimeV2 = {
    ...runtime(),
    version: 2,
    fareBrandOptions: [
      {
        brandOptionKey: "flight-brand-v1:without-cabin",
        fareBrandName: "Example Brand",
        ownerNames: ["Example Air"],
      },
    ],
    selectedBrandOptionKey: "flight-brand-v1:without-cabin",
  };
  assert.deepEqual(
    parseDealsFlightRuntimeV2(
      JSON.stringify(branded),
      "search-key",
      "round-trip",
      1,
    ),
    branded,
  );
  assert.equal(
    parseDealsFlightRuntimeV2(
      JSON.stringify({
        ...branded,
        fareBrandOptions: [
          { ...branded.fareBrandOptions![0], cabinClass: "premium-economy" },
        ],
      }),
      "search-key",
      "round-trip",
      1,
    ),
    null,
  );
});

test("fails closed for internally invalid selections", () => {
  assert.equal(
    parseDealsFlightRuntimeV2(
      JSON.stringify({ ...runtime(), selectedReturnKey: "missing" }),
      "search-key",
      "round-trip",
      1,
    ),
    null,
  );
  assert.equal(
    parseDealsFlightRuntimeV2(
      JSON.stringify({
        ...runtime("one-way"),
        selectedReturnKey: inbound.itineraryKey,
      }),
      "search-key",
      "one-way",
      1,
    ),
    null,
  );
});

test("uses only the versioned session storage namespace and excludes provider identities", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
  assert.equal(writeDealsFlightRuntimeV2(storage, runtime()).ok, true);
  assert.deepEqual([...values.keys()], [DEALS_FLIGHT_RUNTIME_STORAGE_KEY]);
  const serialized = values.get(DEALS_FLIGHT_RUNTIME_STORAGE_KEY)!;
  assert.ok(serialized.includes(token));
  for (const secret of [
    "off_secret_123",
    "duffel-off_secret_123",
    "providerOfferId",
    "rawProviderReference",
  ])
    assert.ok(!serialized.includes(secret));
  const read = readDealsFlightRuntimeV2(storage, "search-key", "round-trip", 1);
  assert.equal(read.ok, true);
  if (read.ok) assert.deepEqual(read.value, runtime());
});

test("normalizes throwing storage operations", () => {
  const unavailable = () => {
    throw new Error("blocked");
  };
  assert.deepEqual(
    readDealsFlightRuntimeV2(
      { getItem: unavailable, removeItem: unavailable },
      "search-key",
      "round-trip",
    ),
    { ok: false, code: "STORAGE_UNAVAILABLE" },
  );
  assert.deepEqual(
    writeDealsFlightRuntimeV2({ setItem: unavailable }, runtime()),
    {
      ok: false,
      code: "STORAGE_UNAVAILABLE",
    },
  );
  assert.deepEqual(clearDealsFlightRuntimeV2({ removeItem: unavailable }), {
    ok: false,
    code: "STORAGE_UNAVAILABLE",
  });
});

test("rejects invalid expiry and fare projections", () => {
  for (const patch of [
    { inventoryExpiresAt: "not-a-date" },
    { fareChoices: [{ ...runtime().fareChoices[0], fareKey: "forged" }] },
    { fareChoices: [{ ...runtime().fareChoices[0], sourcePrice: Infinity }] },
    { fareChoices: [{ ...runtime().fareChoices[0], sourceCurrency: "usd" }] },
    { fareChoices: [{ ...runtime().fareChoices[0], offerExpiresAt: -1 }] },
  ])
    assert.equal(
      parseDealsFlightRuntimeV2(
        JSON.stringify({ ...runtime(), ...patch }),
        "search-key",
        "round-trip",
        1,
      ),
      null,
    );
});
