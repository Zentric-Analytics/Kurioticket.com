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
  assert.match(native, /<FlowIcon name="share" size=\{18\}/);
  assert.match(native, /fareInfoTab:\{minHeight:48/);
});

test("available Flight Details uses a universal edge-to-edge hero with safe controls", () => {
  const availableReturn = native.indexOf('return <SafeAreaView edges={[]}', native.indexOf("const share=async"));
  const loading = native.slice(native.indexOf("function FlightDetailsLoadingSkeleton"), native.indexOf("function TopBar"));
  const available = native.slice(availableReturn, native.indexOf("function FlightDetailsLoadingSkeleton"));

  assert.match(available, /<StatusBar style="light" translucent backgroundColor="transparent"\/?>/);
  assert.match(available, /<ImageBackground testID="flight-details-hero" source=\{require\("\.\.\/\.\.\/\.\.\/assets\/heroes\/flight-details-hero\.webp"\)\}/);
  assert.match(available, /style=\{\[s\.heroControls,\{top:inset\.top\+8\}\]\}/);
  assert.match(available, /accessibilityLabel="Back to results" onPress=\{\(\)=>router\.back\(\)\} style=\{s\.heroIconButton\}><ArrowLeft/);
  assert.match(native, /heroIconButton:\{width:44,height:44,borderRadius:22/);
  assert.doesNotMatch(loading, /flight-details-hero|ImageBackground|StatusBar style="light"/);
});

test("hero owns route, Save, and Share without restoring Edit search", () => {
  const heroStart = native.indexOf('<ImageBackground testID="flight-details-hero"');
  const heroEnd = native.indexOf("</ImageBackground>", heroStart);
  const hero = native.slice(heroStart, heroEnd);

  assert.match(hero, /testID="flight-details-route-summary"/);
  assert.match(hero, /flightDetailsRouteLabel/);
  assert.match(hero, /\{tripMetadata\}/);
  assert.match(hero, /label=\{saved\?"Remove saved flight":"Save flight"\}/);
  assert.match(hero, /label="Share flight"/);
  const metadata = hero.indexOf("{tripMetadata}");
  const route = hero.indexOf("flightDetailsRouteLabel");
  const cities = hero.indexOf("{cityRoute}");
  assert.ok(metadata < route && route < cities, "hero orders metadata, airport route, then city route");
  assert.doesNotMatch(hero, /departureDate|returnDate|providerName|activePrice/);
  assert.doesNotMatch(native, /accessibilityLabel="Edit search"|>Edit search<|FilePenLine|pathname:"\/edit-flight-search"/);
});

test("hero controls use independent Hotel-style save and share targets in one pill", () => {
  const heroStart = native.indexOf('<ImageBackground testID="flight-details-hero"');
  const heroEnd = native.indexOf("</ImageBackground>", heroStart);
  const hero = native.slice(heroStart, heroEnd);
  assert.match(native, /heroActions:\{[^}]*width:96,height:44,borderRadius:22,backgroundColor:"#FFFFFF",flexDirection:"row",overflow:"hidden"/);
  assert.match(native, /heroAction:\{width:48,height:44,alignItems:"center",justifyContent:"center"\}/);
  assert.equal(hero.match(/<IconButton/g)?.length, 2);
  assert.match(hero, /label=\{saved\?"Remove saved flight":"Save flight"\} onPress=\{\(\)=>savedFlights\.toggle/);
  assert.match(hero, /label="Share flight" onPress=\{\(\)=>void share\(\)\}/);
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

test("loading and unavailable states keep their existing fixed page header", () => {
  assert.equal(native.match(/<TopBar backgroundColor=\{theme\.background\}/g)?.length, 2);
  assert.match(native, /state === "loading"\) return <FlightDetailsLoadingSkeleton/);
  assert.match(native, /state !== "available" \|\| !details \|\| !selected[\s\S]*?<TopBar backgroundColor=\{theme\.background\}\/>/);
});

test("flight save action uses the canonical favorite visual states", () => {
  assert.match(native, /label=\{saved\?"Remove saved flight":"Save flight"\} onPress=\{\(\)=>savedFlights\.toggle/);
  assert.match(native, /savedFlights\.toggle\(savedOffer,nativeFlightEditSearchParams\(details,one\(params\.currency\)\)\)/);
  assert.match(native, /<Heart size=\{18\} color=\{saved \? androidFavoriteColors\.savedStroke : androidFavoriteColors\.unsavedStroke\} fill=\{saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}\/>/);
  assert.doesNotMatch(native, /<Heart[^>]*(?:theme\.icon|fill="transparent")/);
});
