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
  assert.match(native, /travelApi\.flightRedirect\(offerId, \{ handoff: journeyEvents.prepareHandoff\(journeyRequestId\) \}\)/);
});

test("checkout never falls back to a serialized provider URL", () => {
  assert.doesNotMatch(native, /authoritativeProviderUrl|\.bookingUrl|\.partnerRedirectUrl/);
  assert.match(native, /await Linking\.openURL\(response\.url\)/);
  assert.match(native, /error\.status===409 && error\.details\?\.code==="offer_changed"/);
});

test("loaded booking lives in provider cards while loading keeps its inert checkout placeholder", () => {
  const available = native.slice(native.indexOf('return <SafeAreaView edges={[]}'), native.indexOf("function FlightDetailsLoadingSkeleton"));
  const loading = native.slice(native.indexOf("function FlightDetailsLoadingSkeleton"), native.indexOf("function HeroCurve"));
  const deals = native.slice(native.indexOf('if(tab==="deals")'), native.indexOf('if(tab==="details")'));

  assert.doesNotMatch(available, /s\.sticky|Continue deal|checkoutTotal|checkoutAction/);
  assert.match(deals, /accessibilityRole="button"/);
  assert.match(deals, />View deal<\/Text>/);
  assert.match(deals, /onViewDeal\(deal\.offerId\)/);
  assert.match(loading, /testID="flight-details-loading-checkout"/);
  assert.match(loading, /style=\{\[s\.sticky,theme\.dark\?s\.stickyDark:s\.stickyLight/);
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

  const hotelDetails = readFileSync(resolve("src/features/search/HotelDetailsScreen.tsx"), "utf8");
  assert.doesNotMatch(available, /<StatusBar\b/);
  assert.doesNotMatch(loading, /<StatusBar\b/);
  assert.doesNotMatch(hotelDetails, /<StatusBar\b/);
  assert.match(available, /<SafeAreaView edges=\{\[\]\}/);
  assert.match(available, /contentInsetAdjustmentBehavior="never"/);
  assert.match(available, /<ImageBackground testID="flight-details-hero"[^\n]*source=\{require\("\.\.\/\.\.\/\.\.\/assets\/heroes\/flight-details-hero\.webp"\)\}/);
  const scrollStart = available.indexOf('<ScrollView testID="flight-details-scroll-content"');
  const controls = available.indexOf('testID="flight-details-back-control"');
  assert.ok(controls > -1 && controls < scrollStart, "the compact Back control must be a screen-level sibling before the vertical ScrollView");
  assert.match(available, /testID="flight-details-back-control" style=\{\[s\.heroBackControl,\{top:inset\.top\+8\}\]\}/);
  assert.match(available, /accessibilityLabel="Back to results" onPress=\{\(\)=>router\.back\(\)\} style=\{s\.heroIconButton\}>[\s\S]*?<ArrowLeft/);
  assert.match(native, /heroIconButton:\{width:44,height:44,borderRadius:22/);
  assert.match(native, /heroBackControl:\{position:"absolute",left:16,width:44,height:44,zIndex:\d+\}/);
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
  assert.match(native, /testID="flight-details-floating-actions"[\s\S]*?label=\{saved\?"Remove saved flight":"Save flight"\}/);
  assert.match(native, /testID="flight-details-floating-actions"[\s\S]*?label="Share flight"/);
  const metadata = hero.indexOf("{tripMetadata}");
  const route = hero.indexOf("flightDetailsRouteLabel");
  assert.ok(route > -1 && metadata > route, "hero orders airport route first, then trip metadata");
  assert.doesNotMatch(hero, /\{cityRoute\}/);
  assert.doesNotMatch(hero, /departureDate|returnDate|providerName|activePrice/);
  assert.doesNotMatch(native, /accessibilityLabel="Edit search"|>Edit search<|FilePenLine|pathname:"\/edit-flight-search"/);
});

test("hero controls preserve independent save and share targets in a smaller glass pill", () => {
  const controlsStart = native.indexOf('<View testID="flight-details-back-control"');
  const controlsEnd = native.indexOf("</SafeAreaView>", controlsStart);
  const controls = native.slice(controlsStart, controlsEnd);
  assert.match(native, /heroActions:\{[^}]*width:88,height:44,flexDirection:"row"/);
  assert.match(native, /heroActionsGlass:\{position:"absolute",left:0,right:0,top:2,bottom:2,borderRadius:20\}/);
  assert.match(controls, /<DetailGlassSurface dark=\{false\} variant="hotelLight" style=\{s\.heroActionsGlass\}\/>/);
  assert.doesNotMatch(native, /rgba\(255, 255, 255, 0\.68\)/);
  assert.match(native, /heroAction:\{width:44,height:44,alignItems:"center",justifyContent:"center"\}/);
  assert.equal(controls.match(/<IconButton/g)?.length, 2);
  assert.match(controls, /label=\{saved\?"Remove saved flight":"Save flight"\} onPress=\{\(\)=>savedFlights\.toggle/);
  assert.match(controls, /label="Share flight" onPress=\{\(\)=>void share\(\)\}/);
  assert.match(native, /heroIconButton:\{width:44,height:44,borderRadius:22/);
  assert.match(native, /routeMetadata:\{color:"#FFFFFF"[^}]*textTransform:"uppercase"/);
  assert.match(native, /minimumFontScale=\{0\.75\} style=\{s\.routeMetadata\}/);
  assert.doesNotMatch(native, /Kurioticket.*(?:logo|wordmark)|(?:logo|wordmark).*Kurioticket/i);
});

test("available Flight Details uses the approved white canvas without changing the hero", () => {
  const available = native.slice(native.indexOf('return <SafeAreaView edges={[]}'), native.indexOf("function FlightDetailsLoadingSkeleton"));
  const loading = native.slice(native.indexOf("function FlightDetailsLoadingSkeleton"), native.indexOf("function HeroCurve"));
  assert.match(native, /const FLIGHT_DETAILS_LIGHT_CANVAS = "#FFFFFF"/);
  assert.match(native, /const FLIGHT_DETAILS_LOADING_LIGHT_CANVAS = "#F3F6FA"/);
  assert.match(native, /const contentCanvasColor=theme\.dark\?theme\.background:FLIGHT_DETAILS_LIGHT_CANVAS/);
  assert.match(available, /style=\{\[s\.safe,\{backgroundColor:contentCanvasColor\}\]\}/);
  assert.match(available, /<ImageBackground testID="flight-details-hero"[^\n]*source=\{require\("\.\.\/\.\.\/\.\.\/assets\/heroes\/flight-details-hero\.webp"\)\}/);
  assert.doesNotMatch(available, /s\.sticky/);
  assert.match(loading, /const contentCanvasColor=theme\.dark\?theme\.background:FLIGHT_DETAILS_LOADING_LIGHT_CANVAS/);
  assert.match(resultsShell, /FLIGHT_RESULTS_LIGHT_CANVAS = "#F5F7FB"/);
});

test("only unavailable and error states retain the fixed page header", () => {
  assert.equal(native.match(/<TopBar backgroundColor=\{theme\.background\}/g)?.length, 1);
  assert.match(native, /state === "loading"\) return <FlightDetailsLoadingSkeleton/);
  assert.match(native, /state !== "available" \|\| !details \|\| !selected[\s\S]*?<TopBar backgroundColor=\{theme\.background\}\/>/);
});

test("flight Hotel light glass keeps unsaved Save icon visible in dark mode", () => {
  assert.match(native, /color=\{saved \? androidFavoriteColors\.savedStroke : androidFavoriteColors\.unsavedStroke\}/);
});

test("flight save action uses the canonical favorite visual states", () => {
  assert.match(native, /label=\{saved\?"Remove saved flight":"Save flight"\} onPress=\{\(\)=>savedFlights\.toggle/);
  assert.match(native, /savedFlights\.toggle\(savedOffer,nativeFlightEditSearchParams\(details,one\(params\.currency\)\)\)/);
  assert.match(native, /<Heart size=\{17\} strokeWidth=\{androidFavoriteColors\.strokeWidth\} color=\{saved \? androidFavoriteColors\.savedStroke : androidFavoriteColors\.unsavedStroke\} fill=\{saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}\/>/);
  assert.match(native, /const heroIconColor="#0F172A"/);
  assert.doesNotMatch(native, /<Heart[^>]*fill="transparent"/);
});
