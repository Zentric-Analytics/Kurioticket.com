import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carMap = readFileSync(
  "src/features/search/NativeAppleCarMap.ios.tsx",
  "utf8",
);
const carFullMap = readFileSync(
  "src/features/search/NativeCarFullMapModal.tsx",
  "utf8",
);
const bridge = readFileSync(
  "src/features/search/NativeAppleCarLookAroundPreview.ios.tsx",
  "utf8",
);
const hotelLocation = readFileSync(
  "src/features/search/NativeHotelLocationSection.tsx",
  "utf8",
);

test("Cars and Hotel share the working default Look Around presentation", () => {
  assert.match(carFullMap, /NativeAppleCarLookAroundPreview/);
  assert.match(hotelLocation, /NativeAppleCarLookAroundPreview/);
  assert.match(bridge, /presentationMode = "swiftUI"/);
  assert.match(bridge, /presentationMode=\{presentationMode\}/);
  assert.doesNotMatch(carFullMap, /presentationMode=/);
  assert.doesNotMatch(hotelLocation, /presentationMode=/);
});

test("Cars repositions only the supported Apple Legal label instead of hiding MapKit attribution", () => {
  assert.match(carMap, /const CAR_FULL_MAP_LEGAL_LABEL_INSETS =/);
  assert.match(
    carMap,
    /legalLabelInsets=\{interactive \? CAR_FULL_MAP_LEGAL_LABEL_INSETS : undefined\}/,
  );
  assert.doesNotMatch(carMap, /appleLogoInsets|opacity:\s*0|display:\s*["']none["']/);
});
