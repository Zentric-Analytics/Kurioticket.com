import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ios = readFileSync("src/features/search/NativeAppleCarMap.ios.tsx", "utf8");
const fallback = readFileSync("src/features/search/NativeAppleCarMap.tsx", "utf8");
const details = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");

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

test("Cars Details selects Apple Maps only for trusted iOS coordinates and retains WebView fallback", () => {
  assert.match(details, /nativeCarTrustedPickupCoordinates\(pickupLocation\)/);
  assert.match(details, /Platform\.OS==="ios"&&trustedPickupCoordinates\?<NativeAppleCarMap/);
  assert.match(details, /locationLabel=\{pickupLocation\} interactive/);
  assert.match(details, /:embed&&!failed\?<WebView/);
  assert.doesNotMatch(details, /Platform\.OS!=="ios"&&embed/);
  assert.match(details, /nativeCarLocationEmbedUrl\(api\.baseUrl,result\.id,search\)/);
  assert.match(details, /getApiBaseUrl\(Platform\.OS,__DEV__\)/);
});

test("the pilot adds no user-location permission surface", () => {
  const combined = `${ios}\n${fallback}\n${details}`;
  assert.doesNotMatch(combined, /expo-location|react-native-geolocation|requestForegroundPermissionsAsync|requestBackgroundPermissionsAsync|showsUserLocation=\{true\}|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|NSLocationWhenInUseUsageDescription/);
});
