import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");
const dockStart = source.indexOf('<View style={[s.sticky');
const dockEnd = source.indexOf("</SafeAreaView>;", dockStart);
const dock = dockStart >= 0 && dockEnd > dockStart ? source.slice(dockStart, dockEnd) : "";

function styleRule(name: string, nextName: string) {
  const start = source.indexOf(`${name}:{`);
  const end = source.indexOf(`${nextName}:{`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("Flight dock puts the price before its traveler-specific supporting label", () => {
  assert.ok(dock.indexOf("s.total") < dock.indexOf("s.checkoutLabel"));
  assert.match(dock, /displayPricesReady\?\(activePrice\?\.formatted\?\?"Price unavailable"\) : "Loading price…"/);
  assert.match(dock, /Total for \{details\.search\.travelers\} traveler\{details\.search\.travelers===1\?"":"s"\}/);
});

test("Flight dock matches the Cars price and supporting-label typography", () => {
  assert.match(styleRule("total", "checkoutLabel"), /fontSize:19[^}]*lineHeight:22[^}]*fontWeight:"600"[^}]*fontFamily:appFonts\.semibold[^}]*letterSpacing:-0\.25[^}]*textAlign:"left"[^}]*fontVariant:\["tabular-nums"\]/);
  assert.match(styleRule("checkoutLabel", "checkoutAction"), /fontSize:11[^}]*lineHeight:16[^}]*fontWeight:"600"[^}]*fontFamily:appFonts\.semibold/);
});

test("Flight dock uses the Cars CTA copy, treatment, and platform geometry", () => {
  assert.match(dock, /booking\?"Checking offer…":"Continue deal"/);
  assert.doesNotMatch(dock, /Continue to|provider/);
  assert.match(dock, /accessibilityRole="button"/);
  assert.match(dock, /accessibilityState=\{\{disabled:checkoutDisabled\}\}/);
  assert.match(dock, /disabled=\{checkoutDisabled\}/);
  assert.match(dock, /onPress=\{\(\)=>void handoff\(selectedDeal\?\.offerId\?\?offer\.id\)\}/);
  assert.match(dock, /style=\{\[s\.checkoutAction,Platform\.OS==="android"&&s\.checkoutActionAndroid\]\}/);
  assert.match(styleRule("checkoutAction", "checkoutActionAndroid"), /flex:\.78[^}]*minWidth:140[^}]*maxWidth:180/);
  assert.match(styleRule("checkoutActionAndroid", "continue"), /flex:\.76[^}]*minWidth:132[^}]*maxWidth:176/);
  assert.match(styleRule("continue", "continueDisabled"), /width:"100%"[^}]*minHeight:48[^}]*borderRadius:8[^}]*backgroundColor:ui\.blue[^}]*paddingHorizontal:12[^}]*alignItems:"center"[^}]*justifyContent:"center"/);
  assert.match(styleRule("continueText", "fares"), /fontSize:12[^}]*lineHeight:16[^}]*fontWeight:"700"[^}]*fontFamily:appFonts\.bold[^}]*color:"white"[^}]*textAlign:"center"/);
});

test("Flight dock retains handoff readiness and offer-change behavior", () => {
  assert.match(source, /const checkoutDisabled=booking\|\|!fareReady\|\|\(!selectedDeal&&!selected\.handoff\.available\)/);
  assert.match(source, /travelApi\.flightRedirect\(offerId\)/);
  assert.match(source, /Linking\.openURL\(response\.url\)/);
  assert.match(source, /error\.details\?\.code==="offer_changed"/);
});
