import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const detail = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const native = readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"), "utf8");

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
  for (const label of ["Back to results", "Edit search"]) assert.match(native, new RegExp(`accessibilityLabel="${label}"`));
  assert.match(native, /label="Share flight"/);
  assert.match(native, /accessibilityRole="radiogroup"/);
  assert.match(native, /accessibilityRole="radio" accessibilityState=\{\{selected:/);
  assert.match(native, /accessibilityRole="tab" accessibilityState=\{\{selected:/);
  assert.match(native, /iconButton:\{width:44,height:44/);
  assert.match(native, /tab:\{minHeight:44/);
});

test("available flight header keeps only back, save, and share fixed", () => {
  const availableReturn = native.indexOf('return <SafeAreaView edges={["top"]}', native.indexOf("const share=async"));
  const scrollStart = native.indexOf('<ScrollView testID="flight-details-scroll-content"', availableReturn);
  const fixedTopBar = native.slice(availableReturn, scrollStart);

  assert.match(fixedTopBar, /<TopBar[\s\S]*?Remove saved flight[\s\S]*?Save flight/);
  assert.match(fixedTopBar, /label="Share flight"/);
  assert.doesNotMatch(fixedTopBar, /Edit search|flight-details-route-summary|flightDetailsRouteLabel/);
});

test("route context and edit search belong to normal scrolling content", () => {
  const scrollStart = native.indexOf('<ScrollView testID="flight-details-scroll-content"');
  const scrollEnd = native.indexOf("</ScrollView><View style={[s.sticky", scrollStart);
  const scrollingContent = native.slice(scrollStart, scrollEnd);

  assert.match(scrollingContent, /testID="flight-details-route-summary"/);
  assert.match(scrollingContent, /flightDetailsRouteLabel/);
  assert.match(scrollingContent, /\{tripMetadata\}/);
  assert.match(scrollingContent, /accessibilityLabel="Edit search"/);
  assert.match(scrollingContent, /pathname:"\/edit-flight-search",params:nativeFlightEditSearchParams/);
  assert.doesNotMatch(scrollingContent, /label="Share flight"|Remove saved flight/);
});

test("native header spacing and scroll separation stay compact", () => {
  assert.match(native, /content:\{paddingHorizontal:18,paddingTop:5,gap:14\}/);
  assert.match(native, /iconButton:\{width:44,height:44/);
  assert.match(native, /edit:\{minHeight:44,flexShrink:0/);
  assert.match(native, /const next=nativeEvent\.contentOffset\.y>1;if\(next!==hasScrolledRef\.current\)/);
  assert.match(native, /hasScrolled&&s\.topBarScrolled/);
  assert.doesNotMatch(native, /Kurioticket.*(?:logo|wordmark)|(?:logo|wordmark).*Kurioticket/i);
});

test("fixed flight header remains usable with scaled text on narrow screens", () => {
  assert.match(native, /<Text numberOfLines=\{1\} ellipsizeMode="tail" style=\{s\.backText\}>Back to results<\/Text>/);
  assert.match(native, /topBar:\{minHeight:52[\s\S]*?paddingVertical:4/);
  assert.doesNotMatch(native, /topBar:\{height:52/);
  assert.match(native, /topActions:\{flexDirection:"row",alignItems:"center",gap:2,flexShrink:0\}/);
  assert.match(native, /back:\{minHeight:44,flexShrink:1,minWidth:0/);
  assert.match(native, /backText:\{color:ui\.blue,fontWeight:"800",flexShrink:1\}/);
});

test("flight save action uses the canonical favorite visual states", () => {
  assert.match(native, /label=\{saved\?"Remove saved flight":"Save flight"\} onPress=\{\(\)=>savedFlights\.toggle/);
  assert.match(native, /<Heart size=\{20\} color=\{androidFavoriteColors\.stroke\} fill=\{saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}\/>/);
  assert.doesNotMatch(native, /<Heart[^>]*(?:theme\.icon|fill="transparent")/);
});
