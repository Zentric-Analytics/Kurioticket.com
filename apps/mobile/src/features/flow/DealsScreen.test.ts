import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const products = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");
const deals = products.slice(products.indexOf("type DealTab"), products.indexOf("const styles = StyleSheet.create"));

test("Deals exposes exactly the four combined package options", () => {
  const options = [...deals.matchAll(/\{ value: "([^"]+)", label: "([^"]+)" \}/g)].map((match) => match[2]);
  assert.deepEqual(options, ["Hotel + Flight", "Hotel + Flight + Car", "Hotel + Car", "Flight + Car"]);
  for (const standalone of ["Flight", "Hotel", "Car"]) assert.equal(options.includes(standalone), false);
});

test("each package selects only its required reusable sections", () => {
  assert.match(deals, /includesFlight = tab === "hotel-flight" \|\| tab === "hotel-flight-car" \|\| tab === "flight-car"/);
  assert.match(deals, /includesHotel = tab === "hotel-flight" \|\| tab === "hotel-flight-car" \|\| tab === "hotel-car"/);
  assert.match(deals, /includesCar = tab === "hotel-flight-car" \|\| tab === "hotel-car" \|\| tab === "flight-car"/);
  assert.match(deals, /<FlightSearchPanel embedded/);
  assert.match(deals, /<HotelSearchPanel embedded/);
  assert.match(deals, /<CarSearchPanel embedded/);
});

test("switching packages stays in place and each selection has one package search button", () => {
  assert.match(deals, /onPress=\{\(\) => setTab\(option\.value\)\}/);
  assert.doesNotMatch(deals, /router\.(?:push|replace|navigate)/);
  assert.match(deals, /FlightSearchPanel embedded showSubmit=\{false\}/);
  assert.match(deals, /HotelSearchPanel embedded showSubmit=\{!includesCar\} submitLabel="Search package"/);
  assert.match(deals, /CarSearchPanel embedded showSubmit submitLabel="Search package"/);
});
