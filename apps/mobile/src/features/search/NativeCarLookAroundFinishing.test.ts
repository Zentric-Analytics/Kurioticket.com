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
const nativeModule = readFileSync(
  "modules/kurioticket-car-look-around/ios/KurioticketCarLookAroundModule.swift",
  "utf8",
);
const nativeView = readFileSync(
  "modules/kurioticket-car-look-around/ios/KurioticketCarLookAroundView.swift",
  "utf8",
);
const hotelLocation = readFileSync(
  "src/features/search/NativeHotelLocationSection.tsx",
  "utf8",
);

test("Cars full map opts into the native Look Around controller while Hotel keeps the shared default", () => {
  assert.match(carFullMap, /presentationMode="viewController"/);
  assert.match(bridge, /presentationMode = "swiftUI"/);
  assert.match(bridge, /presentationMode=\{presentationMode\}/);
  assert.match(nativeModule, /Prop\("presentationMode"\)/);
  assert.match(nativeView, /MKLookAroundViewController\(scene: scene\)/);
  assert.match(nativeView, /lookAroundController\.isNavigationEnabled = true/);
  assert.match(nativeView, /lookAroundController\.showsRoadLabels = true/);
  assert.match(nativeView, /lookAroundController\.pointOfInterestFilter = \.excludingAll/);
  assert.match(nativeView, /lookAroundController\.badgePosition = \.topLeading/);
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
