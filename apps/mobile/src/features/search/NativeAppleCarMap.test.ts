import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ios = readFileSync("src/features/search/NativeAppleCarMap.ios.tsx", "utf8");
const fallback = readFileSync("src/features/search/NativeAppleCarMap.tsx", "utf8");
const details = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const fullMap = readFileSync("src/features/search/NativeCarFullMapModal.tsx", "utf8");
const detailsModel = readFileSync("src/features/search/nativeCarDetailsModel.ts", "utf8");

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

test("Cars Details gives iOS a complete Apple-or-native-fallback preview branch", () => {
  assert.match(details, /nativeCarTrustedMapCoordinates\(pickupLocation\)/);
  assert.match(details, /accessibilityRole="button" accessibilityLabel=\{`Open full map for \$\{pickupLocation\}`\} accessibilityHint="Opens an interactive map inside Kurioticket" onPress=\{\(\)=>setFullMapOpen\(true\)\}/);
  assert.match(details, /<View pointerEvents="none" accessible=\{false\} importantForAccessibility="no-hide-descendants" style=\{s\.mapPreviewContent\}>/);
  assert.match(details, /Platform\.OS==="ios"\?\(trustedMapCoordinates\?<NativeAppleCarMap \{\.\.\.trustedMapCoordinates\} locationLabel=\{pickupLocation\}\/>(?:[\s\S]*?)Map preview unavailable(?:[\s\S]*?)\):embed&&!mapPreviewFailed\?<WebView[^>]*scrollEnabled=\{false\}/);
  assert.doesNotMatch(details, /Platform\.OS==="ios"&&trustedMapCoordinates\?<NativeAppleCarMap/);
  assert.match(details, /Platform\.OS!=="ios"&&directions\?<Pressable accessibilityRole="link"/);
  assert.match(details, /nativeCarLocationEmbedUrl\(api\.baseUrl,result\.id,search\)/);
  assert.match(details, /getApiBaseUrl\(Platform\.OS,__DEV__\)/);
  assert.match(details, /<NativeCarFullMapModal visible=\{fullMapOpen\} pickupLocation=\{pickupLocation\} trustedMapCoordinates=\{trustedMapCoordinates\} embedUrl=\{embed\}/);
});

test("the Cars full-screen modal is immersive and exposes truthful nearby Street View", () => {
  assert.match(fullMap, /presentationStyle="fullScreen"/);
  assert.match(fullMap, /animationType="slide"/);
  assert.match(fullMap, /onRequestClose=\{closeFullMap\}/);
  assert.match(fullMap, /<SafeAreaProvider>/);
  assert.match(fullMap, /edges=\{\["top", "bottom", "left", "right"\]\}/);
  assert.match(fullMap, /accessibilityLabel="Close map"/);
  assert.doesNotMatch(fullMap, /fullMapHeader|>Back<|>Map<\/Text><\/View><View accessible/);
  assert.match(fullMap, /const \[view, setView\] = useState<FullMapView>\("map"\)/);
  assert.match(fullMap, /nativeCarStreetViewEmbedUrl\(embedUrl, trustedMapCoordinates\)/);
  assert.match(fullMap, /accessibilityLabel=\{`Open Street View near \$\{pickupLocation\}`\}/);
  assert.match(fullMap, /accessibilityHint="Shows street-level imagery near the pickup search area"/);
  assert.match(fullMap, /accessibilityLabel="Return to map"/);
  assert.match(fullMap, /Street View near this search area/);
  assert.match(fullMap, /Exact rental desk or collection point may differ/);
  assert.match(fullMap, /Platform\.OS === "ios"\s*\? trustedMapCoordinates/);
  assert.match(fullMap, /locationLabel=\{pickupLocation\} interactive/);
  assert.match(fullMap, /source=\{\{ uri: streetViewUrl \}\}/);
  assert.match(fullMap, /accessibilityLabel="Loading Cars Street View"/);
  assert.match(fullMap, /const STREET_VIEW_SETTLE_MS = 900/);
  assert.match(fullMap, /setFullMapAttempt\(\(attempt\) => attempt \+ 1\)/);
  assert.match(fullMap, /setStreetViewAttempt\(\(attempt\) => attempt \+ 1\)/);
  assert.doesNotMatch(fullMap, /Linking|router\.|PROVIDER_GOOGLE|provider=|expo-location|geolocation/i);
});

test("Street View derives only from the existing Kurioticket embed route plus reviewed map coordinates", () => {
  assert.match(detailsModel, /if \(!mapEmbedUrl \|\| !coordinates\) return null/);
  assert.match(detailsModel, /url\.searchParams\.set\("view", "streetview"\)/);
  assert.match(detailsModel, /url\.searchParams\.set\("latitude", String\(coordinates\.latitude\)\)/);
  assert.match(detailsModel, /url\.searchParams\.set\("longitude", String\(coordinates\.longitude\)\)/);
  assert.doesNotMatch(fullMap + detailsModel, /maps\.googleapis\.com\/maps\/api\/streetview|NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY/);
});

test("the Cars map experience adds no user-location permission surface", () => {
  const combined = `${ios}\n${fallback}\n${details}\n${fullMap}\n${detailsModel}`;
  assert.doesNotMatch(combined, /expo-location|react-native-geolocation|requestForegroundPermissionsAsync|requestBackgroundPermissionsAsync|showsUserLocation=\{true\}|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|NSLocationWhenInUseUsageDescription/);
});
