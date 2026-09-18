import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const detail = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const native = readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"), "utf8");
const resultsShell = readFileSync(resolve("src/features/search/FlightResultsSheetShell.tsx"), "utf8");

test("flight details has one opaque-ID authoritative runtime", () => {
  assert.match(detail, /product === "flight" && params\.id[\s\S]*?<NativeFlightDetails/);
  assert.doesNotMatch(detail, /function FlightDetail|authoritativeProviderUrl/);
  assert.match(native, /travelApi\.flightDetails\(id/);
  assert.match(native, /travelApi\.flightRedirect\(offerId\)/);
});

test("checkout never falls back to a serialized provider URL", () => {
  assert.doesNotMatch(native, /authoritativeProviderUrl|\.bookingUrl|\.partnerRedirectUrl/);
  assert.match(native, /await Linking\.openURL\(response\.url\)/);
  assert.match(native, /error\.status===409 && error\.details\?\.code==="offer_changed"/);
});

test("native actions and checkout meet accessibility requirements", () => {
  assert.match(native, /accessibilityLabel="Back to results"/);
  assert.match(native, /label="Share flight"/);
  assert.match(native, /accessibilityRole="radiogroup"/);
  assert.match(native, /accessibilityRole="radio" accessibilityState=\{\{selected:/);
  assert.match(native, /accessibilityRole="tab" accessibilityState=\{\{selected:/);
  assert.match(native, /heroIconButton:\{width:44,height:44/);
  assert.match(native, /<FlowIcon name="share" size=\{17\}/);
  assert.match(native, /fareInfoTab:\{minHeight:48/);
});

test("available Flight Details uses a universal edge-to-edge hero with safe controls", () => {
  const availableReturn = native.indexOf('return <SafeAreaView edges={[]}', native.indexOf("const share=async"));
  const loading = native.slice(native.indexOf("function FlightDetailsLoadingSkeleton"), native.indexOf("function TopBar"));
  const available = native.slice(availableReturn, native.indexOf("function FlightDetailsLoadingSkeleton"));

  assert.match(available, /<StatusBar style="light" translucent backgroundColor="transparent"\/?>/);
  assert.match(available, /<ImageBackground testID="flight-details-hero" source=\{require\("\.\.\/\.\.\/\.\.\/assets\/heroes\/flight-details-hero\.webp"\)\}/);
  const scrollStart = available.indexOf('<ScrollView testID="flight-details-scroll-content"');
  const controls = available.indexOf('testID="flight-details-floating-controls"');
  assert.ok(controls > -1 && controls < scrollStart, "floating actions must be screen-level siblings before the vertical ScrollView so accessibility order matches the visual header");
  assert.match(available, /testID="flight-details-floating-controls" style=\{\[s\.heroControls,s\.floatingControls,\{top:inset\.top\+8\}\]\}/);
  assert.match(available, /accessibilityLabel="Back to results" onPress=\{\(\)=>router\.back\(\)\} style=\{s\.heroIconButton\}>[\s\S]*?<ArrowLeft/);
  assert.match(native, /heroIconButton:\{width:44,height:44,borderRadius:22/);
  assert.match(native, /floatingControls:\{zIndex:\d+,elevation:\d+\}/);
  assert.doesNotMatch(loading, /flight-details-hero|ImageBackground|StatusBar style="light"/);
});

test("hero owns route while screen-level actions preserve Save and Share without restoring Edit search", () => {
  const heroStart = native.indexOf('<ImageBackground testID="flight-details-hero"');
  const heroEnd = native.indexOf("</ImageBackground>", heroStart);
  const hero = native.slice(heroStart, heroEnd);

  assert.match(hero, /testID="flight-details-route-summary"/);
  assert.match(hero, /flightDetailsRouteLabel/);
  assert.match(hero, /\{tripMetadata\}/);
  assert.doesNotMatch(hero, /label=\{saved\?"Remove saved flight":"Save flight"\}|label="Share flight"|Back to results/);
  assert.match(native, /testID="flight-details-floating-controls"[\s\S]*?label=\{saved\?"Remove saved flight":"Save flight"\}/);
  assert.match(native, /testID="flight-details-floating-controls"[\s\S]*?label="Share flight"/);
  const metadata = hero.indexOf("{tripMetadata}");
  const route = hero.indexOf("flightDetailsRouteLabel");
  assert.ok(route > -1 && metadata > route, "hero orders airport route first, then trip metadata");
  assert.doesNotMatch(hero, /\{cityRoute\}/);
  assert.doesNotMatch(hero, /departureDate|returnDate|providerName|activePrice/);
  assert.doesNotMatch(native, /accessibilityLabel="Edit search"|>Edit search<|FilePenLine|pathname:"\/edit-flight-search"/);
});

test("hero controls preserve independent save and share targets in a smaller glass pill", () => {
  const controlsStart = native.indexOf('<View testID="flight-details-floating-controls"');
  const controlsEnd = native.indexOf("</SafeAreaView>", controlsStart);
  const controls = native.slice(controlsStart, controlsEnd);
  assert.match(native, /heroActions:\{[^}]*width:88,height:44,flexDirection:"row"/);
  assert.match(native, /heroActionsGlass:\{[^}]*top:2,bottom:2,borderRadius:20[^}]*backgroundColor:"rgba\(255, 255, 255, 0\.68\)"/);
  assert.match(native, /heroAction:\{width:44,height:44,alignItems:"center",justifyContent:"center"\}/);
  assert.equal(controls.match(/<IconButton/g)?.length, 2);
  assert.match(controls, /label=\{saved\?"Remove saved flight":"Save flight"\} onPress=\{\(\)=>savedFlights\.toggle/);
  assert.match(controls, /label="Share flight" onPress=\{\(\)=>void share\(\)\}/);
  assert.match(native, /heroIconButton:\{width:44,height:44,borderRadius:22/);
  assert.match(native, /routeMetadata:\{color:"#FFFFFF"[^}]*textTransform:"uppercase"/);
  assert.match(native, /minimumFontScale=\{0\.75\} style=\{s\.routeMetadata\}/);
  assert.doesNotMatch(native, /Kurioticket.*(?:logo|wordmark)|(?:logo|wordmark).*Kurioticket/i);
});

test("available Flight Details uses the Flight Results canvas without flattening hero or sticky surfaces", () => {
  const available = native.slice(native.indexOf('return <SafeAreaView edges={[]}'), native.indexOf("function FlightDetailsLoadingSkeleton"));
  assert.match(native, /import \{ FLIGHT_RESULTS_LIGHT_CANVAS \} from "\.\/FlightResultsSheetShell"/);
  assert.match(native, /const contentCanvasColor=theme\.dark\?theme\.background:FLIGHT_RESULTS_LIGHT_CANVAS/);
  assert.match(available, /style=\{\[s\.safe,\{backgroundColor:contentCanvasColor\}\]\}/);
  assert.match(available, /<ImageBackground testID="flight-details-hero" source=\{require\("\.\.\/\.\.\/\.\.\/assets\/heroes\/flight-details-hero\.webp"\)\}/);
  assert.match(available, /s\.sticky,\{[^}]*backgroundColor:theme\.surface/);
  assert.match(resultsShell, /FLIGHT_RESULTS_LIGHT_CANVAS = "#F5F7FB"/);
});

test("only unavailable and error states retain the fixed page header", () => {
  assert.equal(native.match(/<TopBar backgroundColor=\{theme\.background\}/g)?.length, 1);
  assert.match(native, /state === "loading"\) return <FlightDetailsLoadingSkeleton/);
  assert.match(native, /state !== "available" \|\| !details \|\| !selected[\s\S]*?<TopBar backgroundColor=\{theme\.background\}\/>/);
});

test("flight save action uses the canonical favorite visual states", () => {
  assert.match(native, /label=\{saved\?"Remove saved flight":"Save flight"\} onPress=\{\(\)=>savedFlights\.toggle/);
  assert.match(native, /savedFlights\.toggle\(savedOffer,nativeFlightEditSearchParams\(details,one\(params\.currency\)\)\)/);
  assert.match(native, /<Heart size=\{17\} color=\{saved \? androidFavoriteColors\.savedStroke : androidFavoriteColors\.unsavedStroke\} fill=\{saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}\/>/);
  assert.doesNotMatch(native, /<Heart[^>]*(?:theme\.icon|fill="transparent")/);
});
