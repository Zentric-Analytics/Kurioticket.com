import assert from "node:assert/strict";
import test from "node:test";
import { getHotelLocationFieldDisplay } from "./hotelLocationFieldDisplay";

test("selected canonical hotel values retain full supporting context", () => {
  assert.deepEqual(getHotelLocationFieldDisplay("Montreal, Canada"), {
    primary: "Montreal",
    secondary: "Quebec, Canada",
  });
});

test("Results-summary catalogue destinations expose the customer-facing primary", () => {
  assert.equal(getHotelLocationFieldDisplay("Paris, France").primary, "Paris");
  assert.equal(getHotelLocationFieldDisplay("Montreal, Canada").primary, "Montreal");
  assert.equal(getHotelLocationFieldDisplay("Berlin, Germany").primary, "Berlin");
  assert.equal(getHotelLocationFieldDisplay("JFK Airport area, New York").primary, "JFK Airport area");
});

test("permissive custom hotel text retains the generic URL display contract", () => {
  assert.deepEqual(getHotelLocationFieldDisplay("Custom Beach"), { primary: "Custom Beach" });
});
