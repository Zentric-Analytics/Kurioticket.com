import assert from "node:assert/strict";
import test from "node:test";

import { swapMultiCityLegState } from "@/lib/flights/multiCitySwap";

test("swaps one leg's route and verified airports while leaving other legs unchanged", () => {
  const second = {
    origin: "BNE",
    destination: "SYD",
    departureDate: "2026-10-02",
  };
  const result = swapMultiCityLegState(
    [
      { origin: "IAH", destination: "BNE", departureDate: "2026-10-01" },
      second,
    ],
    {
      "0:origin": "IAH",
      "0:destination": "BNE",
      "1:origin": "BNE",
      "1:destination": "SYD",
    },
    0,
  );
  assert.deepEqual(result.legs[0], {
    origin: "BNE",
    destination: "IAH",
    departureDate: "2026-10-01",
  });
  assert.deepEqual(result.legs[1], second);
  assert.equal(result.verifiedAirports["0:origin"], "BNE");
  assert.equal(result.verifiedAirports["0:destination"], "IAH");
  assert.equal(result.verifiedAirports["1:origin"], "BNE");
});

test("moves partial route and verification state without crashing", () => {
  const result = swapMultiCityLegState(
    [{ origin: "BNE", destination: "", departureDate: "2026-10-01" }],
    { "0:origin": "BNE" },
    0,
  );
  assert.equal(result.legs[0].origin, "");
  assert.equal(result.legs[0].destination, "BNE");
  assert.equal(result.verifiedAirports["0:origin"], "");
  assert.equal(result.verifiedAirports["0:destination"], "BNE");
});
