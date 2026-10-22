import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Apple native maps are isolated to iOS with no Google provider or location permission", () => {
  const ios = readFileSync("src/features/search/NativeAppleHotelMap.ios.tsx", "utf8");
  const fallback = readFileSync("src/features/search/NativeAppleHotelMap.tsx", "utf8");
  assert.match(ios, /from "react-native-maps"/);
  assert.doesNotMatch(ios, /PROVIDER_GOOGLE|provider=|WebView/);
  assert.match(ios, /showsUserLocation=\{false\}/);
  assert.match(ios, /scrollEnabled=\{interactive\}/);
  assert.match(ios, /<Marker coordinate=\{\{ latitude, longitude \}\}/);
  assert.doesNotMatch(fallback, /from "react-native-maps"/);
});

test("embedded iOS Look Around is native MapKit and never a Google WebView", () => {
  const bridge = readFileSync("src/features/search/NativeAppleHotelLookAround.ios.tsx", "utf8");
  const module = readFileSync("modules/kurioticket-hotel-look-around/ios/KurioticketHotelLookAroundModule.swift", "utf8");
  const view = readFileSync("modules/kurioticket-hotel-look-around/ios/KurioticketHotelLookAroundView.swift", "utf8");
  const fingerprint = readFileSync("fingerprint.config.js", "utf8");

  assert.match(bridge, /requireOptionalNativeModule\("KurioticketHotelLookAround"\)/);
  assert.match(bridge, /requireNativeViewManager<NativeProps>\("KurioticketHotelLookAround"\)/);
  assert.match(module, /View\(KurioticketHotelLookAroundView\.self\)/);
  assert.match(view, /import MapKit/);
  assert.match(view, /MKLookAroundSceneRequest\(coordinate: coordinate\)/);
  assert.match(view, /InlineLookAroundViewController\(scene: scene\)/);
  assert.match(view, /lookAroundController\.isNavigationEnabled = true/);
  assert.match(view, /override func hitTest\(_ point: CGPoint, with event: UIEvent\?\) -> UIView\?/);
  assert.match(view, /controllerView\.hitTest\(controllerPoint, with: event\)/);
  assert.match(view, /lookAroundController\.view\.isUserInteractionEnabled = true/);
  assert.match(view, /private final class InlineLookAroundViewController: MKLookAroundViewController/);
  assert.match(view, /override func present\(/);
  assert.match(view, /override func show\(_ viewController: UIViewController, sender: Any\?\)/);
  assert.match(view, /override func showDetailViewController\(_ viewController: UIViewController, sender: Any\?\)/);
  assert.match(view, /hideFullScreenAffordance\(in: view\)/);
  assert.doesNotMatch(bridge + module + view, /Google|WebView|google\.com/);
  assert.match(fingerprint, /modules\/kurioticket-hotel-look-around/);
});

test("both hotel previews validate coordinates and keep Android image previews", () => {
  for (const file of ["NativeHotelLocationSection", "NativeHotelDecisionSections"]) {
    const source = readFileSync(`src/features/search/${file}.tsx`, "utf8");
    assert.match(source, /Platform.OS === "ios" && hasValidHotelCoordinates\(propertyDetails\)/);
    assert.match(source, /pointerEvents="none"/);
    assert.match(source, /Platform.OS !== "ios" && .*?\? <Image/);
    assert.match(source, /propertyDetails=\{propertyDetails\} hotelName=\{hotelName\}/);
  }
});

test("full-screen iOS maps are interactive and remain inside the existing modal", () => {
  const source = readFileSync("src/features/search/NativeHotelFullMapModal.tsx", "utf8");
  assert.match(source, /visible && <NativeAppleHotelMap.* interactive/);
  assert.match(source, /Platform.OS !== "ios" && fullMapUrl && !fullMapFailed/);
  assert.match(source, /presentationStyle="fullScreen"/);
  assert.doesNotMatch(source, /Linking|openURL/);
});
