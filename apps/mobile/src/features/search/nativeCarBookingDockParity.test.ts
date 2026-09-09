import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatMarketCurrency } from "../currency/displayCurrency";

const source = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const dock = source.slice(source.indexOf("</ScrollView>{offer?"), source.indexOf("</SafeAreaView>;}", source.indexOf("</ScrollView>{offer?")));
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

test("Cars dock removes duration while Compare retains rental-day context", () => {
  assert.match(dock, /offer\.pricePerDay/);
  assert.match(dock, /per day/);
  assert.doesNotMatch(dock, /\{days\}|rental day/);
  assert.match(compare, /\{days\} rental day\{days===1\?"":"s"\}/);
});

test("Cars dock uses market precision without changing the Compare formatter", () => {
  assert.match(dock, /formatMarketCurrency\(offer\.totalPrice,offer\.currency\)/);
  assert.match(dock, /formatMarketCurrency\(offer\.pricePerDay,offer\.currency\)/);
  assert.match(compare, /money\(offer\.currency,offer\.pricePerDay\)/);
  assert.equal(formatMarketCurrency(278, "USD"), "$278.00");
  assert.equal(formatMarketCurrency(139, "USD"), "$139.00");
  assert.equal(formatMarketCurrency(278, "JPY"), "¥278");
});

test("Cars dock matches the Hotel price hierarchy", () => {
  assert.match(dock, /estimated rental total/);
  assert.match(dock, /<Info accessible=\{false\} size=\{12\} color=\{theme\.textSecondary\}\/\>/);
  assert.match(dock, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.83\} style=\{\[s\.dockTotal/);
  assert.match(dock, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.72\} style=\{\[s\.dockPerDay/);
  assert.match(styleRule("dockLabel", "dockEyebrow"), /gap:4/);
  assert.match(styleRule("dockEyebrow", "dockTotal"), /fontSize:11[^}]*lineHeight:16[^}]*fontWeight:"600"[^}]*fontFamily:appFonts\.semibold/);
  assert.match(styleRule("dockTotal", "dockPerDay"), /fontSize:24[^}]*lineHeight:30[^}]*fontWeight:"800"[^}]*fontFamily:appFonts\.extraBold[^}]*textAlign:"left"/);
  assert.match(styleRule("dockPerDay", "dockAction"), /fontSize:11[^}]*lineHeight:16[^}]*fontWeight:"400"[^}]*fontFamily:appFonts\.regular[^}]*textAlign:"left"/);
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
  assert.match(styleRule("dockPrice", "dockLabel"), /flex:1[^}]*minWidth:0[^}]*gap:1/);
  assert.match(styleRule("dockAction", "continue"), /flex:\.9[^}]*minWidth:132/);
  assert.match(styleRule("continue", "continueText"), /width:"100%"[^}]*minHeight:48[^}]*borderRadius:8[^}]*backgroundColor:colors\.blue[^}]*paddingHorizontal:12[^}]*alignItems:"center"[^}]*justifyContent:"center"/);
  assert.match(styleRule("continueText", "loading"), /fontSize:12[^}]*lineHeight:16[^}]*fontWeight:"700"[^}]*fontFamily:appFonts\.bold[^}]*textAlign:"center"/);
});
