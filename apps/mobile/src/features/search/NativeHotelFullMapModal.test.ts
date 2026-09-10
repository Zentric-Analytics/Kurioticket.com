import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync("src/features/search/NativeHotelFullMapModal.tsx", "utf8");

test("shared Hotel map modal preserves the approved full-screen in-app behavior", () => {
  assert.match(component, /presentationStyle="fullScreen"/);
  assert.match(component, /<SafeAreaProvider>/);
  assert.match(component, /<SafeAreaView edges=\{\["top", "bottom", "left", "right"\]\} accessibilityViewIsModal/);
  assert.match(component, /accessibilityLabel="Back to hotel details"/);
  assert.match(component, /nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "map"\)/);
  assert.match(component, /<WebView key=\{`\$\{hotelId\}:full-map:\$\{fullMapAttempt\}`\}/);
  assert.match(component, /onError=\{\(\) => setFullMapFailed\(true\)\}/);
  assert.match(component, /onHttpError=\{\(\) => setFullMapFailed\(true\)\}/);
  assert.match(component, /Map unavailable/);
  assert.match(component, /accessibilityLabel="Try loading map again"[\s\S]*?>Try again</);
  assert.match(component, /setFullMapAttempt\(\(attempt\) => attempt \+ 1\)/);
  assert.match(component, /const closeFullMap = \(\) => \{[\s\S]*?setFullMapFailed\(false\);[\s\S]*?onClose\(\);/);
});

test("shared Hotel map modal never hands navigation to an external map", () => {
  for (const forbidden of ["Linking", "openURL", "canOpenURL", "maps.apple.com", "geo:", "google.com/maps/search", "router."]) {
    assert.doesNotMatch(component, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const credential of ["EXPO_PUBLIC_GOOGLE", "NEXT_PUBLIC_GOOGLE", "google.com/maps/embed"]) {
    assert.doesNotMatch(component, new RegExp(credential.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
