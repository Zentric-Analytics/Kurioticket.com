import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatMarketCurrency } from "../currency/displayCurrency";

const source = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const dockStart = source.indexOf("{offer?<View style={[s.dock");
const dockEnd = source.indexOf("</SafeAreaView>;}", dockStart);
const dock = dockStart >= 0 && dockEnd > dockStart ? source.slice(dockStart, dockEnd) : "";
const compare = source.slice(source.indexOf("function Compare("), source.indexOf("function TimelineEntry("));

function styleRule(name: string, nextName: string) {
  const start = source.indexOf(`${name}:{`);
  const end = source.indexOf(`${nextName}:{`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("Cars dock preserves exact copy and disabled handoff behavior", () => {
  assert.equal((dock.match(/Continue deal/g) ?? []).length, 1);
  assert.doesNotMatch(dock, /Continue booking/);
  assert.match(dock, /accessibilityRole="button"[^>]*accessibilityState=\{\{disabled:true\}\}[^>]*disabled/);
  assert.doesNotMatch(dock, /onPress|Linking|router\./);
});

test("Cars dock removes daily pricing while Compare retains it", () => {
  assert.doesNotMatch(dock, /offer\.pricePerDay|>per day<|s\.dockPerDay/);
  assert.doesNotMatch(dock, /\{days\}|rental day/);
  assert.match(compare, /money\(offer\.currency,offer\.pricePerDay\)/);
  assert.match(compare, />per day<|per day deal/);
  assert.match(compare, /\{days\} rental day\{days===1\?"":"s"\}/);
});

test("Cars dock uses market precision without changing the Compare formatter", () => {
  assert.match(dock, /formatMarketCurrency\(offer\.totalPrice,offer\.currency\)/);
  assert.match(compare, /money\(offer\.currency,offer\.pricePerDay\)/);
  assert.equal(formatMarketCurrency(278, "USD"), "$278.00");
  assert.equal(formatMarketCurrency(139, "USD"), "$139.00");
  assert.equal(formatMarketCurrency(278, "JPY"), "¥278");
});

test("Cars dock uses the total-only price hierarchy", () => {
  assert.match(dock, /<Text numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.82\}[^>]*>Estimated rental total<\/Text>/);
  assert.doesNotMatch(dock, /estimated rental total|<Info|s\.dockLabel|s\.dockPerDay/);
  assert.ok(dock.indexOf("s.dockTotal") < dock.indexOf("s.dockEyebrow"));
  assert.match(dock, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.65\} style=\{\[s\.dockTotal/);
  assert.match(styleRule("dockEyebrow", "dockTotal"), /flexShrink:1[^}]*minWidth:0[^}]*fontSize:11[^}]*lineHeight:16[^}]*fontWeight:"600"[^}]*fontFamily:appFonts\.semibold/);
  assert.match(styleRule("dockTotal", "dockAction"), /maxWidth:"100%"[^}]*fontSize:19[^}]*lineHeight:22[^}]*fontWeight:"600"[^}]*fontFamily:appFonts\.semibold[^}]*letterSpacing:-0\.25[^}]*textAlign:"left"/);
  assert.match(styleRule("daily", "perDay"), /fontSize:19[^}]*lineHeight:22[^}]*fontWeight:"600"[^}]*fontFamily:appFonts\.semibold[^}]*letterSpacing:-0\.25[^}]*textAlign:"right"/);
  assert.match(styleRule("perDay", "pickupSection"), /fontSize:10[^}]*lineHeight:13[^}]*fontWeight:"500"[^}]*fontFamily:appFonts\.medium/);
  assert.doesNotMatch(dock, /width<370\?20:24/);
});

test("Cars sticky sheet and columns match Hotel geometry", () => {
  const sheet = styleRule("dock", "dockContent");
  assert.match(sheet, /position:"absolute"[^}]*left:0[^}]*right:0[^}]*bottom:0/);
  assert.match(sheet, /borderTopLeftRadius:22[^}]*borderTopRightRadius:22/);
  assert.match(sheet, /paddingHorizontal:16[^}]*paddingTop:12/);
  assert.match(sheet, /shadowColor:"#0F172A"[^}]*shadowOffset:\{width:0,height:-8\}[^}]*shadowOpacity:\.14[^}]*shadowRadius:14[^}]*elevation:12/);
  assert.match(dock, /paddingBottom:12\+inset\.bottom/);
  assert.match(styleRule("dockContent", "dockPrice"), /width:"100%"[^}]*flexDirection:"row"[^}]*alignItems:"center"[^}]*gap:12/);
  assert.match(styleRule("dockPrice", "dockEyebrow"), /flex:1[^}]*minWidth:0[^}]*gap:1/);
  assert.match(dock, /style=\{\[s\.dockAction,Platform\.OS==="android"&&s\.dockActionAndroid\]\}/);
  assert.match(styleRule("dockAction", "dockActionAndroid"), /flex:\.78[^}]*minWidth:140[^}]*maxWidth:180/);
  assert.match(styleRule("dockActionAndroid", "continue"), /flex:\.76[^}]*minWidth:132[^}]*maxWidth:176/);
  assert.match(styleRule("continue", "continueText"), /width:"100%"[^}]*minHeight:48[^}]*borderRadius:8[^}]*backgroundColor:colors\.blue[^}]*paddingHorizontal:12[^}]*alignItems:"center"[^}]*justifyContent:"center"/);
  assert.match(styleRule("continueText", "loading"), /fontSize:12[^}]*lineHeight:16[^}]*fontWeight:"700"[^}]*fontFamily:appFonts\.bold[^}]*textAlign:"center"/);
});
