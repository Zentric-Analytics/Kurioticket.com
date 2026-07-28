import assert from "node:assert/strict";
import test from "node:test";

import { pickupCards, type CarPickupCard } from "@/data/carsLandingContent";

import {
  getCarPickupCardSummary,
  getCarPickupImageSource,
  hasCarPickupCardIssues,
  isValidCarPickupImage,
  selectCarPickupCardRows,
} from "./page-data";

test("selector preserves every source record and derives the requested summary", () => {
  const rows = selectCarPickupCardRows();
  assert.equal(rows.length, pickupCards.length);
  assert.deepEqual(getCarPickupCardSummary(rows), {
    pickupCards: 4,
    uniquePickupLocations: 4,
    configuredImages: 4,
    publicUsage: "Cars landing",
  });
  assert.ok(rows.every((row, index) => row.pickupLocation === pickupCards[index].pickupLocation));
});

test("selector flags duplicate locations, translation keys, and images without removing rows", () => {
  const cards: CarPickupCard[] = [
    pickupCards[0],
    {
      ...pickupCards[1],
      pickupLocation: ` ${pickupCards[0].pickupLocation.toUpperCase()} `,
      translationKey: pickupCards[0].translationKey,
      image: pickupCards[0].image,
    },
  ];
  const rows = selectCarPickupCardRows(cards);
  assert.equal(rows.length, cards.length);
  assert.ok(rows.every((row) => row.duplicatePickupLocation));
  assert.ok(rows.every((row) => row.duplicateTranslationKey));
  assert.ok(rows.every((row) => row.duplicateImage));
  assert.ok(rows.every(hasCarPickupCardIssues));
});

test("selector distinguishes missing translation and image values from invalid images", () => {
  const rows = selectCarPickupCardRows([
    { pickupLocation: "Missing", translationKey: " ", image: "" },
    { pickupLocation: "Invalid", translationKey: "carsPickup.Invalid", image: "javascript:alert(1)" },
  ]);
  assert.equal(rows[0].missingTranslationKey, true);
  assert.equal(rows[0].missingImage, true);
  assert.equal(rows[0].invalidImage, false);
  assert.equal(rows[1].missingImage, false);
  assert.equal(rows[1].invalidImage, true);
});

test("image validation accepts configured web URLs and local paths only", () => {
  assert.equal(isValidCarPickupImage("https://images.example.com/card.jpg"), true);
  assert.equal(isValidCarPickupImage("/images/cars/card.jpg"), true);
  assert.equal(isValidCarPickupImage("//images.example.com/card.jpg"), false);
  assert.equal(isValidCarPickupImage("not a URL"), false);
  assert.equal(getCarPickupImageSource("https://images.unsplash.com/card.jpg"), "images.unsplash.com");
  assert.equal(getCarPickupImageSource(""), "Not configured");
});
