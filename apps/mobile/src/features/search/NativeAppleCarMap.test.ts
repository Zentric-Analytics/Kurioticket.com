import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ios = readFileSync(
  "src/features/search/NativeAppleCarMap.ios.tsx",
  "utf8",
);
const sharedHotelMap = readFileSync(
  "src/features/search/NativeAppleHotelMap.ios.tsx",
  "utf8",
);
const fallback = readFileSync(
  "src/features/search/NativeAppleCarMap.tsx",
  "utf8",
);
const details = readFileSync(
  "src/features/search/ApprovedCarDetailScreen.tsx",
  "utf8",
);
const fullMap = readFileSync(
  "src/features/search/NativeCarFullMapModal.tsx",
  "utf8",
);
const detailsModel = readFileSync(
  "src/features/search/nativeCarDetailsModel.ts",
  "utf8",
);
const lookAroundBridge = readFileSync(
  "src/features/search/NativeAppleCarLookAroundPreview.ios.tsx",
  "utf8",
);
const lookAroundFallback = readFileSync(
  "src/features/search/NativeAppleCarLookAroundPreview.tsx",
  "utf8",
);
const lookAroundModule = readFileSync(
  "modules/kurioticket-car-look-around/ios/KurioticketCarLookAroundModule.swift",
  "utf8",
);
const lookAroundView = readFileSync(
  "modules/kurioticket-car-look-around/ios/KurioticketCarLookAroundView.swift",
  "utf8",
);
const fingerprint = readFileSync("fingerprint.config.js", "utf8");

test("Cars reuses the Hotel Apple map renderer for the supplied pickup", () => {
  assert.match(ios, /import \{ NativeAppleHotelMap \} from "\.\/NativeAppleHotelMap"/);
  assert.match(
    ios,
    /<NativeAppleHotelMap latitude=\{latitude\} longitude=\{longitude\} hotelName=\{locationLabel\} interactive=\{interactive\} legalLabelInsets=\{interactive \? CAR_FULL_MAP_LEGAL_LABEL_INSETS : undefined\} \/>/,
  );
  assert.doesNotMatch(
    ios,
    /from "react-native-maps"|<MapView|<Marker|WebView|expo-location|geolocation/i,
  );

  assert.match(sharedHotelMap, /from "react-native-maps"/);
  assert.match(sharedHotelMap, /<MapView/);
  assert.match(
    sharedHotelMap,
    /<Marker coordinate=\{\{ latitude, longitude \}\} title=\{hotelName\}/,
  );
  assert.match(sharedHotelMap, /initialRegion=\{\{ latitude, longitude,/);
  assert.match(sharedHotelMap, /accessibilityLabel=\{`Map showing \$\{hotelName\}`\}/);
  for (const interaction of ["scroll", "zoom", "rotate", "pitch"])
    assert.match(sharedHotelMap, new RegExp(`${interaction}Enabled=\\{interactive\\}`));
  assert.match(sharedHotelMap, /showsUserLocation=\{false\}/);
  assert.match(sharedHotelMap, /legalLabelInsets=\{legalLabelInsets\}/);
  assert.doesNotMatch(
    sharedHotelMap,
    /PROVIDER_GOOGLE|provider=|WebView|expo-location|geolocation/i,
  );
});

test("the non-iOS component cannot introduce a native Android map", () => {
  assert.doesNotMatch(fallback, /react-native-maps|MapView|Marker|WebView/);
  assert.match(fallback, /return null/);
});

test("Cars Details gives iOS a complete Apple-or-native-fallback preview branch", () => {
  assert.match(details, /nativeCarTrustedMapCoordinates\(pickupLocation\)/);
  assert.match(
    details,
    /accessibilityRole="button" accessibilityLabel=\{`Open full map for \$\{pickupLocation\}`\} accessibilityHint="Opens an interactive map inside Kurioticket" onPress=\{\(\)=>setFullMapOpen\(true\)\}/,
  );
  assert.match(
    details,
    /<View pointerEvents="none" accessible=\{false\} importantForAccessibility="no-hide-descendants" style=\{s\.mapPreviewContent\}>/,
  );
  assert.match(
    details,
    /Platform\.OS==="ios"\?\(trustedMapCoordinates\?<NativeAppleCarMap \{\.\.\.trustedMapCoordinates\} locationLabel=\{pickupLocation\}\/>(?:[\s\S]*?)Map preview unavailable(?:[\s\S]*?)\):embed&&!mapPreviewFailed\?<WebView[^>]*scrollEnabled=\{false\}/,
  );
  assert.doesNotMatch(
    details,
    /Platform\.OS==="ios"&&trustedMapCoordinates\?<NativeAppleCarMap/,
  );
  assert.match(
    details,
    /Platform\.OS!=="ios"&&directions\?<Pressable accessibilityRole="link"/,
  );
  assert.match(
    details,
    /nativeCarLocationEmbedUrl\(api\.baseUrl,result\.id,search\)/,
  );
  assert.match(details, /getApiBaseUrl\(Platform\.OS,__DEV__\)/);
  assert.match(
    details,
    /<NativeCarFullMapModal visible=\{fullMapOpen\} pickupLocation=\{pickupLocation\} trustedMapCoordinates=\{trustedMapCoordinates\} embedUrl=\{embed\}/,
  );
});

test("the Cars full-screen modal stays immersive with minimal map chrome", () => {
  assert.match(fullMap, /presentationStyle="fullScreen"/);
  assert.match(fullMap, /animationType="slide"/);
  assert.match(fullMap, /onRequestClose=\{closeCurrentSurface\}/);
  assert.match(fullMap, /<SafeAreaProvider>/);
  assert.match(fullMap, /edges=\{\["top", "bottom", "left", "right"\]\}/);
  assert.match(fullMap, /"Close Look Around" : "Close map"/);
  assert.doesNotMatch(
    fullMap,
    /fullMapHeader|>Back<|>Map<\/Text><\/View><View accessible/,
  );
  assert.match(
    fullMap,
    /const \[view, setView\] = useState<FullMapView>\("map"\)/,
  );
  assert.match(
    fullMap,
    /type FullMapView = "map" \| "streetview" \| "lookaround"/,
  );
  assert.match(
    fullMap,
    /Platform\.OS === "ios"[\s\S]*?\? null[\s\S]*?: nativeCarStreetViewEmbedUrl\(embedUrl, trustedMapCoordinates\)/,
  );
  assert.match(
    fullMap,
    /accessibilityLabel=\{`Open Street View near \$\{pickupLocation\}`\}/,
  );
  assert.match(
    fullMap,
    /accessibilityHint="Shows street-level imagery near the pickup search area"/,
  );
  assert.match(fullMap, /accessibilityLabel="Return to map"/);
  assert.match(
    fullMap,
    /streetViewPreviewMedia: \{ flex: 1, overflow: "hidden" \}/,
  );
  assert.match(
    fullMap,
    /streetViewPreviewWebView: \{[\s\S]*?left: -56,[\s\S]*?top: -8,[\s\S]*?width: 240,[\s\S]*?height: 220/,
  );
  assert.match(
    fullMap,
    /mapPreviewButton: \{[\s\S]*?left: 16,[\s\S]*?bottom: 18,[\s\S]*?width: 52,[\s\S]*?height: 52,[\s\S]*?borderRadius: 26/,
  );
  assert.doesNotMatch(
    fullMap,
    /Nearby imagery|Pickup search area|Street View near this search area|Exact rental desk or collection point may differ|streetViewPreviewLabel|locationContext|mapPreviewButtonText/,
  );
  assert.doesNotMatch(fullMap, />Map<\/Text>/);
  assert.doesNotMatch(fullMap, /Loading Street View…/);
  assert.match(fullMap, /Platform\.OS === "ios" \? \([\s\S]*?trustedMapCoordinates \? \(/);
  assert.match(fullMap, /locationLabel=\{pickupLocation\}[\s\S]*?interactive/);
  assert.match(fullMap, /source=\{\{ uri: streetViewUrl \}\}/);
  assert.match(fullMap, /accessibilityLabel="Loading Cars Street View"/);
  assert.match(fullMap, /const STREET_VIEW_SETTLE_MS = 900/);
  assert.match(fullMap, /setFullMapAttempt\(\(attempt\) => attempt \+ 1\)/);
  assert.match(fullMap, /setStreetViewAttempt\(\(attempt\) => attempt \+ 1\)/);
  assert.doesNotMatch(
    fullMap,
    /Linking|router\.|PROVIDER_GOOGLE|provider=|expo-location|geolocation/i,
  );
});

test("Cars uses its isolated native Apple Look Around preview on iOS", () => {
  assert.match(
    lookAroundBridge,
    /requireOptionalNativeModule\("KurioticketCarLookAround"\)/,
  );
  assert.match(
    lookAroundBridge,
    /requireNativeViewManager<NativeProps>\("KurioticketCarLookAround"\)/,
  );
  assert.match(lookAroundModule, /View\(KurioticketCarLookAroundView\.self\)/);
  assert.match(lookAroundView, /import MapKit/);
  assert.match(lookAroundView, /import SwiftUI/);
  assert.match(
    lookAroundView,
    /MKLookAroundSceneRequest\(coordinate: coordinate\)/,
  );
  assert.match(lookAroundView, /LookAroundPreview\(/);
  assert.match(lookAroundView, /allowsNavigation: true/);
  assert.match(lookAroundView, /badgePosition: \.topLeading/);
  assert.match(
    lookAroundView,
    /UIHostingController\(rootView: CarLookAroundPreview\(scene: scene\)\)/,
  );
  assert.doesNotMatch(
    lookAroundBridge + lookAroundModule + lookAroundView,
    /Google|WebView|google\.com/,
  );
  assert.match(fingerprint, /modules\/kurioticket-car-look-around/);
});

test("the iOS modal owns Look Around promotion while Android retains Google Street View", () => {
  assert.match(
    fullMap,
    /accessibilityLabel=\{`Open Look Around near \$\{pickupLocation\}`\}/,
  );
  assert.match(fullMap, /disabled=\{lookAroundStatus !== "ready"\}/);
  assert.match(
    fullMap,
    /<View pointerEvents="none" style=\{styles\.lookAroundPreviewNative\}>/,
  );
  assert.match(fullMap, /onPress=\{showLookAround\}/);
  assert.match(
    fullMap,
    /view === "lookaround"[\s\S]*?presentationMode="viewController"/,
  );
  assert.match(
    fullMap,
    /lookAroundStatus !== "ready" &&[\s\S]*?styles\.lookAroundPreviewHidden/,
  );
  assert.match(fullMap, /visible &&[\s\S]*?trustedMapCoordinates/);
  assert.doesNotMatch(
    fullMap,
    /pointerEvents=\{lookAroundStatus === "ready" \? "auto" : "none"\}/,
  );
  assert.match(
    fullMap,
    /view === "map" && streetViewUrl \? \([\s\S]*?<WebView/,
  );
  assert.match(fullMap, /streetViewUrl && !streetViewFailed[\s\S]*?<WebView/);
  assert.match(lookAroundFallback, /onStatusChange\("unavailable"\)/);
});

test("Cars Look Around cancels requests and rejects stale or detached scenes", () => {
  assert.match(
    lookAroundView,
    /cancelActiveRequest = \{ request\.cancel\(\) \}/,
  );
  assert.match(
    lookAroundView,
    /self\.window != nil, self\.generation == requestGeneration/,
  );
  assert.match(lookAroundView, /reloadWorkItem\?\.cancel\(\)/);
  assert.match(lookAroundView, /guard #available\(iOS 17\.0, \*\) else/);
  assert.match(lookAroundView, /emitStatus\("unavailable"\)/);
  assert.match(lookAroundView, /willMove\(toParent: nil\)/);
  assert.match(lookAroundView, /removeFromParent\(\)/);
});

test("Street View derives only from the existing Kurioticket embed route plus reviewed map coordinates", () => {
  assert.match(
    detailsModel,
    /if \(!mapEmbedUrl \|\| !coordinates\) return null/,
  );
  assert.match(detailsModel, /url\.searchParams\.set\("view", "streetview"\)/);
  assert.match(
    detailsModel,
    /url\.searchParams\.set\("latitude", String\(coordinates\.latitude\)\)/,
  );
  assert.match(
    detailsModel,
    /url\.searchParams\.set\("longitude", String\(coordinates\.longitude\)\)/,
  );
  assert.doesNotMatch(
    fullMap + detailsModel,
    /maps\.googleapis\.com\/maps\/api\/streetview|NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY/,
  );
});

test("the Cars map experience adds no user-location permission surface", () => {
  const combined = `${ios}\n${sharedHotelMap}\n${fallback}\n${details}\n${fullMap}\n${detailsModel}\n${lookAroundBridge}\n${lookAroundModule}\n${lookAroundView}`;
  assert.doesNotMatch(
    combined,
    /expo-location|react-native-geolocation|requestForegroundPermissionsAsync|requestBackgroundPermissionsAsync|showsUserLocation=\{true\}|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|NSLocationWhenInUseUsageDescription/,
  );
});
