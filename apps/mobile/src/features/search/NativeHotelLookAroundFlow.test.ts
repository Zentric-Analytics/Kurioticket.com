import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const location = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");
const fullLookAround = readFileSync("src/features/search/NativeHotelFullLookAroundModal.tsx", "utf8");

test("iOS Look Around matches the existing map preview-to-full-screen interaction", () => {
  assert.match(location, /const \[fullLookAroundOpen, setFullLookAroundOpen\] = useState\(false\);/);
  assert.match(location, /<View accessibilityElementsHidden pointerEvents="none" style=\{styles\.map\}>[\s\S]*?<NativeAppleHotelLookAround/);
  assert.match(location, /accessibilityLabel=\{`Open full Look Around for \$\{hotelName\}`\}/);
  assert.match(location, /accessibilityHint="Opens an interactive Look Around view inside Kurioticket"/);
  assert.match(location, /onPress=\{\(\) => setFullLookAroundOpen\(true\)\}/);
  assert.match(location, /style=\{styles\.lookAroundTapOverlay\}/);
  assert.match(location, /lookAroundTapOverlay: \{ \.\.\.StyleSheet\.absoluteFillObject, zIndex: 1 \}/);
  assert.doesNotMatch(location, /disabled=\{lookAroundStatus !== "ready"\}/);
  assert.doesNotMatch(location, /accessibilityState=\{\{ disabled: lookAroundStatus !== "ready" \}\}/);
  assert.match(location, /<NativeHotelFullLookAroundModal visible=\{fullLookAroundOpen\}/);
});

test("full-screen Look Around stays inside Kurioticket with the same Back pattern as full map", () => {
  assert.match(fullLookAround, /<Modal visible=\{visible\}[^>]*presentationStyle="fullScreen"/);
  assert.match(fullLookAround, /accessibilityLabel="Back to hotel details"/);
  assert.match(fullLookAround, />Back<\/Text>/);
  assert.match(fullLookAround, />Look Around<\/Text>/);
  assert.match(fullLookAround, /<NativeAppleHotelLookAround[\s\S]*?onStatusChange=\{setStatus\}/);
  assert.match(fullLookAround, /Look Around isn&apos;t available for this location\./);
  assert.doesNotMatch(fullLookAround, /WebView|Linking|openURL|google\.com/);
});
