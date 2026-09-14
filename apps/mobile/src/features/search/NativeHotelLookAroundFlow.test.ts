import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const location = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");
const nativeView = readFileSync("modules/kurioticket-hotel-look-around/ios/KurioticketHotelLookAroundView.swift", "utf8");

test("iOS renders interactive Apple Look Around directly inside Hotel Details", () => {
  assert.match(location, /Platform\.OS === "ios" \? "Look Around" : "Street View"/);
  assert.match(location, /<NativeAppleHotelLookAround key=\{`\$\{hotelId\}:lookaround`\}/);
  assert.doesNotMatch(location, /<View accessibilityElementsHidden pointerEvents="none" style=\{styles\.map\}>/);
  assert.doesNotMatch(location, /NativeHotelFullLookAroundModal|fullLookAroundOpen|lookAroundTapOverlay/);
  assert.match(nativeView, /lookAroundController\.isNavigationEnabled = true/);
  assert.match(nativeView, /override func hitTest\(_ point: CGPoint, with event: UIEvent\?\) -> UIView\?/);
  assert.match(nativeView, /controllerView\.hitTest\(controllerPoint, with: event\)/);
  assert.match(nativeView, /lookAroundController\.view\.isUserInteractionEnabled = true/);
  assert.match(nativeView, /lookAroundController\.delegate = self/);
  assert.match(nativeView, /if !isPresentingFullScreen \{\s*controller\?\.view\.frame = bounds\s*\}/);
  assert.match(nativeView, /lookAroundViewControllerWillPresentFullScreen/);
  assert.match(nativeView, /lookAroundViewControllerDidDismissFullScreen/);
  assert.match(nativeView, /UILongPressGestureRecognizer\(target: self, action: #selector\(handleInteractionGate/);
  assert.match(nativeView, /interactionGate\.minimumPressDuration = 0/);
  assert.match(nativeView, /scrollView\.panGestureRecognizer\.require\(toFail: interactionGate\)/);
  assert.match(nativeView, /shouldRecognizeSimultaneouslyWith/);
});
