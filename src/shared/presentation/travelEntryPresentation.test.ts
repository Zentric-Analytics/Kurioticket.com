import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hotelDestinationCards } from "@/data/hotelDestinationCards";
import {
  primaryHotelDestinationCards,
  travelEntryPresentation,
} from "./travelEntryPresentation";

const source = (path: string) => readFileSync(path, "utf8");

test("web and native Hotel entry surfaces consume one primary destination list", () => {
  assert.deepEqual(hotelDestinationCards, [...primaryHotelDestinationCards]);
  assert.deepEqual(
    primaryHotelDestinationCards.map((card) => card.canonicalDestinationId),
    ["jp-tokyo", "gb-london", "fr-paris", "us-new-york"],
  );
  const native = source("apps/mobile/src/features/flow/ProductScreens.tsx");
  assert.match(native, /primaryHotelDestinationCards\.map/);
  assert.match(native, /buildHotelExplorationSearch/);
  assert.match(native, /source: "hotels-featured"/);
  assert.match(native, /pathname: "\/hotel-results"/);
  assert.doesNotMatch(native, /\{ name: "Bali" \}/);
});

test("native entry pages expose the mobile-web product hierarchy", () => {
  const screens = source("apps/mobile/src/features/flow/ProductScreens.tsx");
  const flight = source("apps/mobile/src/features/flow/FlightSearchPanel.tsx");
  const hotel = source("apps/mobile/src/features/flow/HotelSearchPanel.tsx");
  const car = source("apps/mobile/src/features/flow/CarSearchPanel.tsx");

  for (const product of Object.values(travelEntryPresentation)) {
    assert.ok(product.heroTitle.length > 0);
    assert.match(screens, new RegExp(`travelEntryPresentation\\.${product.product.toLowerCase()}\\.heroTitle`));
    for (const field of product.fields) {
      const target = product.product === "Flights" ? flight : product.product === "Hotels" ? hotel : car;
      if (field === "Drop-off location") continue;
      const nativeLabel = product.product === "Cars" && field === "Pick-up location" ? "Pickup location" : field;
      assert.match(target, new RegExp(`label=["']${nativeLabel.replace(/[&]/g, "&amp;|&")}`));
    }
  }
  assert.doesNotMatch(screens, /title="Routes"|title="Vehicle types"/);
});
