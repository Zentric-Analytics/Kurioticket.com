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

test("checkout dock keeps a responsive price and action hierarchy with theme-aware separation", () => {
  assert.match(native, /style=\{\[s\.sticky,theme\.dark\?s\.stickyDark:s\.stickyLight,\{paddingBottom:Math\.max\(inset\.bottom,10\)/);
  assert.match(native, /checkoutTotal:\{flex:1,minWidth:0,gap:1\}/);
  assert.match(native, /checkoutAction:\{flex:\.78,minWidth:140,maxWidth:180\}/);
  assert.match(native, /checkoutActionAndroid:\{flex:\.76,minWidth:132,maxWidth:176\}/);
  assert.match(native, /checkoutLabel:\{flexShrink:1,minWidth:0,fontSize:11,lineHeight:16,fontWeight:"600",fontFamily:appFonts\.semibold\}/);
  assert.match(native, /total:\{maxWidth:"100%",fontSize:19,lineHeight:22,fontWeight:"600",fontFamily:appFonts\.semibold[^}]*fontVariant:\["tabular-nums"\]/);
  assert.match(native, /<Text numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.72\} style=\{\[s\.total/);
  assert.match(native, /sticky:\{position:"absolute",left:0,right:0,bottom:0[^}]*borderTopWidth:StyleSheet\.hairlineWidth[^}]*elevation:7\}/);
  assert.match(native, /stickyLight:\{[^}]*shadowOffset:\{width:0,height:-4\}[^}]*shadowOpacity:\.1/);
  assert.match(native, /stickyDark:\{[^}]*shadowOffset:\{width:0,height:-4\}[^}]*shadowOpacity:\.28/);
});

test("native actions and checkout meet accessibility requirements", () => {
  assert.match(native, /accessibilityLabel="Back to results"/);
  assert.match(native, /accessibilityLabel=\{saved\?"Remove saved flight":"Save flight"\}/);
  assert.match(native, /accessibilityLabel="Share flight"/);
  assert.match(native, /accessibilityLabel="Kurioticket"/);
  assert.match(native, /accessibilityRole="radiogroup"/);
  assert.match(native, /accessibilityRole="radio" accessibilityState=\{\{selected:/);
  assert.match(native, /accessibilityRole="tab" accessibilityState=\{\{selected:/);
  assert.match(native, /brandHeaderAction:\{width:44,height:44/);
  assert.match(native, /<FlowIcon name="share" size=\{20\}/);
  assert.match(native, /fareInfoTab:\{minHeight:48/);
});

test("available Flight Details uses the branded Kurioticket header above the hero", () => {
  const availableReturn = native.indexOf('return <SafeAreaView edges={[]}', native.indexOf("const share=async"));
  const loading = native.slice(native.indexOf("function FlightDetailsLoadingSkeleton"), native.indexOf("function HeroCurve"));
  const available = native.slice(availableReturn, native.indexOf("function FlightDetailsLoadingSkeleton"));

  assert.match(available, /<FlightDetailsBrandHeader topInset=\{inset\.top\} saved=\{saved\}/);
  assert.match(available, /<ImageBackground testID="flight-details-hero"[^\n]*source=\{require\("\.\.\/\.\.\/\.\.\/assets\/heroes\/flight-details-hero\.webp"\)\}/);
  assert.ok(available.indexOf("<FlightDetailsBrandHeader") < available.indexOf('<ScrollView testID="flight-details-scroll-content"'));
  assert.ok(available.indexOf('<ScrollView testID="flight-details-scroll-content"') < available.indexOf('<ImageBackground testID="flight-details-hero"'));
  assert.match(native, /<StatusBar style="dark" translucent backgroundColor="#FFFFFF"\/>/);
  assert.match(native, /accessibilityLabel="Kurioticket"/);
  assert.match(native, /kurioticket-logo-primary-light-bg\.png/);
  assert.match(loading, /<FlightDetailsBrandHeader topInset=\{topInset\} loading\/>/);
  assert.doesNotMatch(native, /heroBackControl|heroIconGlass|heroActionsGlass|flight-details-protected-header/);
});

test("hero owns route while the branded header owns Back, Save, and Share", () => {
  const heroStart = native.indexOf('<ImageBackground testID="flight-details-hero"');
  const heroEnd = native.indexOf("</ImageBackground>", heroStart);
  const hero = native.slice(heroStart, heroEnd);
  const headerStart = native.indexOf("function FlightDetailsBrandHeader");
  const headerEnd = native.indexOf("function FareStatusIcon", headerStart);
  const header = native.slice(headerStart, headerEnd);

  assert.match(hero, /testID="flight-details-route-summary"/);
  assert.match(hero, /flightDetailsRouteLabel/);
  assert.match(hero, /\{tripMetadata\}/);
  assert.doesNotMatch(hero, /Back to results|Save flight|Share flight|Kurioticket/);
  assert.match(header, /accessibilityLabel="Back to results"/);
  assert.match(header, /accessibilityLabel=\{saved\?"Remove saved flight":"Save flight"\}/);
  assert.match(header, /accessibilityLabel="Share flight"/);
  assert.doesNotMatch(native, /accessibilityLabel="Edit search"|>Edit search<|FilePenLine|pathname:"\/edit-flight-search"/);
});

test("branded header preserves independent Back, Save, and Share touch targets", () => {
  const start = native.indexOf("function FlightDetailsBrandHeader");
  const end = native.indexOf("function FareStatusIcon", start);
  const header = native.slice(start, end);
  assert.equal(header.match(/<Pressable/g)?.length, 3);
  assert.match(header, /brandHeaderAction/);
  assert.match(native, /brandHeaderAction:\{width:44,height:44/);
  assert.match(native, /brandHeaderLogo:\{width:128,height:32/);
  assert.match(header, /onPress=\{\(\)=>router\.back\(\)\}/);
  assert.match(header, /onPress=\{onToggleSaved\}/);
  assert.match(header, /onPress=\{onShare\}/);
  assert.match(header, /disabled=\{saveDisabled\}/);
  assert.match(header, /disabled=\{shareDisabled\}/);
  assert.doesNotMatch(native, /DetailGlassSurface|heroActionsGlass|heroIconGlass/);
});

test("available Flight Details uses the Flight Results canvas without flattening hero or sticky surfaces", () => {
  const available = native.slice(native.indexOf('return <SafeAreaView edges={[]}'), native.indexOf("function FlightDetailsLoadingSkeleton"));
  assert.match(native, /const FLIGHT_DETAILS_LIGHT_CANVAS = "#F3F6FA"/);
  assert.match(native, /const contentCanvasColor=theme\.dark\?theme\.background:FLIGHT_DETAILS_LIGHT_CANVAS/);
  assert.match(available, /style=\{\[s\.safe,\{backgroundColor:contentCanvasColor\}\]\}/);
  assert.match(available, /<ImageBackground testID="flight-details-hero"[^\n]*source=\{require\("\.\.\/\.\.\/\.\.\/assets\/heroes\/flight-details-hero\.webp"\)\}/);
  assert.match(available, /s\.sticky,[^\]]*\{[^}]*backgroundColor:theme\.surface/);
  assert.match(resultsShell, /FLIGHT_RESULTS_LIGHT_CANVAS = "#F5F7FB"/);
});

test("loaded, loading, and error states all use the branded Flight Details header", () => {
  assert.match(native, /state === "loading"\) return <FlightDetailsLoadingSkeleton/);
  assert.match(native, /state !== "available" \|\| !details \|\| !selected[\s\S]*?<FlightDetailsBrandHeader topInset=\{inset\.top\} loading\/>/);
  assert.equal((native.match(/<FlightDetailsBrandHeader/g) ?? []).length, 3);
  assert.doesNotMatch(native, /function TopBar|<TopBar/);
});

test("white branded header keeps canonical favorite and share colors", () => {
  assert.match(native, /const saveColor=saveDisabled\?"#94A3B8":saved\?androidFavoriteColors\.savedStroke:androidFavoriteColors\.unsavedStroke/);
  assert.match(native, /const shareColor=shareDisabled\?"#94A3B8":androidFavoriteColors\.shareStroke/);
  assert.match(native, /backgroundColor:"#FFFFFF"/);
});

test("flight save action uses the canonical favorite visual states", () => {
  assert.match(native, /onToggleSaved=\{\(\)=>savedFlights\.toggle\(savedOffer,nativeFlightEditSearchParams\(details,one\(params\.currency\)\)\)\}/);
  assert.match(native, /<Heart size=\{21\} strokeWidth=\{androidFavoriteColors\.strokeWidth\} color=\{saveColor\} fill=\{saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}\/>/);
  assert.doesNotMatch(native, /const heroIconColor=/);
});
