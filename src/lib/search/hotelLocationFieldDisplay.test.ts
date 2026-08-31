import assert from "node:assert/strict";
import test from "node:test";
import { getHotelLocationFieldDisplay } from "./hotelLocationFieldDisplay";

test("selected canonical hotel values retain full supporting context", () => {
  assert.deepEqual(getHotelLocationFieldDisplay("Montreal, Canada"), {
    primary: "Montreal",
    secondary: "Quebec, Canada",
  });
});

test("permissive custom hotel text retains the generic URL display contract", () => {
  assert.deepEqual(getHotelLocationFieldDisplay("Custom Beach"), { primary: "Custom Beach" });
});
