import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ios = readFileSync("src/features/search/NativeAppleCarMap.ios.tsx", "utf8");
const fallback = readFileSync("src/features/search/NativeAppleCarMap.tsx", "utf8");
const details = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const fullMap = readFileSync("src/features/search/NativeCarFullMapModal.tsx", "utf8");

test("the Cars native map is an interactive iOS MapKit surface for the supplied pickup", () => {
  assert.match(ios, /from "react-native-maps"/);
  assert.match(ios, /<MapView/);
  assert.match(ios, /<Marker coordinate=\{\{ latitude, longitude \}\} title=\{locationLabel\}/);
  assert.match(ios, /initialRegion=\{\{ latitude, longitude,/);
  assert.match(ios, /accessibilityLabel=\{`Map showing \$\{locationLabel\}`\}/);
  for (const interaction of ["scroll", "zoom", "rotate", "pitch"])
    assert.match(ios, new RegExp(`${interaction}Enabled=\\{interactive\\}`));
  assert.match(ios, /showsUserLocation=\{false\}/);
  assert.doesNotMatch(ios, /PROVIDER_GOOGLE|provider=|WebView|expo-location|geolocation/i);
});

test("the non-iOS component cannot introduce a native Android map", () => {
  assert.doesNotMatch(fallback, /react-native-maps|MapView|Marker|WebView/);
  assert.match(fallback, /return null/);
});

test("Cars Details makes native and WebView maps noninteractive previews with one Pressable owner", () => {
  assert.match(details, /nativeCarTrustedPickupCoordinates\(pickupLocation\)/);
  assert.match(details, /accessibilityRole="button" accessibilityLabel=\{`Open full map for \$\{pickupLocation\}`\} accessibilityHint="Opens an interactive map inside Kurioticket" onPress=\{\(\)=>setFullMapOpen\(true\)\}/);
  assert.match(details, /<View pointerEvents="none" accessible=\{false\} importantForAccessibility="no-hide-descendants" style=\{s\.mapPreviewContent\}>/);
  assert.match(details, /Platform\.OS==="ios"&&trustedPickupCoordinates\?<NativeAppleCarMap \{\.\.\.trustedPickupCoordinates\} locationLabel=\{pickupLocation\}\/>/);
  assert.match(details, /:embed&&!mapPreviewFailed\?<WebView[^>]*scrollEnabled=\{false\}/);
  assert.doesNotMatch(details, /Platform\.OS!=="ios"&&embed/);
  assert.match(details, /nativeCarLocationEmbedUrl\(api\.baseUrl,result\.id,search\)/);
  assert.match(details, /getApiBaseUrl\(Platform\.OS,__DEV__\)/);
  assert.match(details, /<NativeCarFullMapModal visible=\{fullMapOpen\} pickupLocation=\{pickupLocation\} trustedPickupCoordinates=\{trustedPickupCoordinates\} embedUrl=\{embed\}/);
});

test("the Cars full-screen modal keeps truthful provider routing and local WebView retry", () => {
  assert.match(fullMap, /presentationStyle="fullScreen"/);
  assert.match(fullMap, /animationType="slide"/);
  assert.match(fullMap, /onRequestClose=\{closeFullMap\}/);
  assert.match(fullMap, /<SafeAreaProvider>/);
  assert.match(fullMap, /edges=\{\["top", "bottom", "left", "right"\]\}/);
  assert.match(fullMap, /accessibilityLabel="Back to car details"/);
  assert.match(fullMap, /<Text accessibilityRole="header" numberOfLines=\{1\}[^>]*>Map<\/Text>/);
  assert.match(fullMap, /Platform\.OS === "ios" && trustedPickupCoordinates/);
  assert.match(fullMap, /locationLabel=\{pickupLocation\} interactive/);
  assert.match(fullMap, /: embedUrl && !fullMapFailed/);
  assert.match(fullMap, /setFullMapFailed\(false\)/);
  assert.match(fullMap, /setFullMapAttempt\(\(attempt\) => attempt \+ 1\)/);
  assert.doesNotMatch(fullMap, /pointerEvents="none"|Linking|router\.|PROVIDER_GOOGLE|provider=|expo-location|geolocation/i);
});

test("the pilot adds no user-location permission surface", () => {
  const combined = `${ios}\n${fallback}\n${details}\n${fullMap}`;
  assert.doesNotMatch(combined, /expo-location|react-native-geolocation|requestForegroundPermissionsAsync|requestBackgroundPermissionsAsync|showsUserLocation=\{true\}|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|NSLocationWhenInUseUsageDescription/);
});
