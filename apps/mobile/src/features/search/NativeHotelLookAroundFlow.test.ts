import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelDetails = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const bookingDetails = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
const location = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");
const nativeView = readFileSync(
  "modules/kurioticket-hotel-look-around/ios/KurioticketHotelLookAroundView.swift",
  "utf8",
);

test("iOS Hotel Look Around stays inline and escapable while Android retains Street View", () => {
  assert.match(location, /NativeAppleHotelLookAround/);
  assert.match(location, /NativeAppleHotelLookAroundStatus/);
  assert.doesNotMatch(location, /NativeAppleCarLookAroundPreview/);
  assert.match(location, /Platform\.OS === "ios" \? null : api\.ok \? nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "streetview"\) : null/);
  assert.match(location, /option === "map" \? "Map" : Platform\.OS === "ios" \? "Look Around" : "Street View"/);
  assert.match(
    location,
    /Platform\.OS === "ios" && streetViewAvailable \? <View style=\{styles\.streetViewFrame\} onTouchStart=\{syncLookAroundInteraction\} onTouchEnd=\{syncLookAroundInteraction\} onTouchCancel=\{syncLookAroundInteraction\}><NativeAppleHotelLookAround/,
  );
  assert.match(location, /hotelName=\{hotelName\}/);
  assert.match(location, /accessibilityLabel="Loading Look Around"/);
  assert.match(location, /Look Around unavailable/);
  assert.match(location, /<WebView key=\{\`\$\{hotelId\}:streetview\`\}/);
  assert.match(location, /scrollEnabled=\{false\}/);
  assert.match(location, /Street View unavailable/);

  assert.match(hotelDetails, /const \[lookAroundInteracting, setLookAroundInteracting\] = useState\(false\)/);
  assert.match(hotelDetails, /<ScrollView[\s\S]*scrollEnabled=\{!lookAroundInteracting\}/);
  assert.match(hotelDetails, /onLookAroundInteractionChange=\{setLookAroundInteracting\}/);
  assert.match(bookingDetails, /onLookAroundInteractionChange=\{onLookAroundInteractionChange\}/);
  assert.match(location, /onLookAroundInteractionChange\?\.\(event\.nativeEvent\.touches\.length > 0\)/);
  assert.match(location, /if \(status === "unavailable"\) releaseLookAroundInteraction\(\)/);
  assert.match(location, /return releaseLookAroundInteraction/);

  assert.match(nativeView, /private final class InlineLookAroundViewController: MKLookAroundViewController/);
  assert.match(nativeView, /override func present\(/);
  assert.match(nativeView, /override func show\(_ viewController: UIViewController, sender: Any\?\)/);
  assert.match(nativeView, /override func showDetailViewController\(_ viewController: UIViewController, sender: Any\?\)/);
  assert.match(nativeView, /hideFullScreenAffordance\(in: view\)/);
});
