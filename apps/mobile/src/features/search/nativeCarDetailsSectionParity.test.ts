import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { CarResult } from "../../api/travelApi";
import { nativeCarDirectionsUrl, nativeCarMileageLabel } from "./nativeCarDetailsModel";

const native = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const route = readFileSync("app/car-details.tsx", "utf8");
const web = readFileSync("../../src/components/results/CarDetailsClient.tsx", "utf8");
const webNav = readFileSync("../../src/components/results/carDetails/CarDetailsSectionNav.tsx", "utf8");

function style(name: string): string {
  const match = native.match(new RegExp(`${name}:\\{([^}]+)\\}`));
  assert.ok(match, `missing ${name} style`);
  return match[1];
}

test("the live route owns one sticky shell and one deterministic horizontal tab row", () => {
  assert.match(route, /ApprovedCarDetailScreen/);
  assert.match(native, /\(\["compare","pickup","location"\] as const\)/);
  assert.equal((native.match(/accessibilityRole="tablist"/g) ?? []).length, 1);
  assert.match(native, /<Text numberOfLines=\{1\}/);
  assert.match(native, /stickyHeaderIndices=\{\[1\]\}/);

  const shell = style("carsTabsShell");
  for (const contract of ['width:"100%"', 'alignSelf:"stretch"', "minHeight:48", "borderBottomWidth:1"])
    assert.ok(shell.includes(contract), contract);
  assert.doesNotMatch(shell, /flexDirection|flexGrow|flexShrink|flexBasis|#075EE8/);

  const row = style("carsTabsRow");
  for (const contract of ['width:"100%"', 'alignSelf:"stretch"', 'flexDirection:"row"', 'flexWrap:"nowrap"', 'alignItems:"stretch"'])
    assert.ok(row.includes(contract), contract);
  assert.doesNotMatch(row, /flexDirection:"column"|flexWrap:"wrap"|#075EE8/);

  const tab = style("carTab");
  assert.match(tab, /minWidth:0/);
  const minimumHeight = /minHeight:(\d+)/.exec(tab);
  assert.ok(minimumHeight);
  assert.ok(Number(minimumHeight[1]) >= 44);
  assert.doesNotMatch(tab, /flexGrow:1|flexShrink:1|flexBasis:0|width:"100%"|flexBasis:"100%"/);

  const widths = [style("carTabCompare"), style("carTabPickup"), style("carTabLocation")]
    .map(rule => Number(/width:"([\d.]+)%"/.exec(rule)?.[1]));
  assert.deepEqual(widths, [32, 43, 25]);
  assert.equal(widths.reduce((total, width) => total + width, 0), 100);

  const shellStart = native.indexOf("<View style={[s.carsTabsShell");
  const rowStart = native.indexOf('<View accessibilityRole="tablist" style={s.carsTabsRow}', shellStart);
  const pageStart = native.indexOf("<View style={s.page}", rowStart);
  assert.ok(shellStart > native.indexOf("<View style={[s.hero"));
  assert.ok(rowStart > shellStart && pageStart > rowStart);
  const tablist = native.slice(rowStart, pageStart);
  assert.doesNotMatch(tablist, /<ScrollView[^>]*horizontal/);
  assert.doesNotMatch(tablist, /Platform\.OS/);
  assert.equal((native.match(/s\.carsTabsShell/g) ?? []).length, 1);
  assert.equal((native.match(/s\.carsTabsRow/g) ?? []).length, 1);

  const underline = style("underline");
  for (const contract of ["left:8", "right:8", "bottom:0", "height:2"])
    assert.ok(underline.includes(contract), contract);
  assert.match(native, /backgroundColor:selected\?"#075EE8":"transparent"/);
  assert.match(tablist, /onPress=\{\(\)=>setActiveTab\(tab\)\}/);
  assert.match(tablist, /accessibilityState=\{\{selected\}\}/);
});

test("the web tab reference remains the mobile parity contract", () => {
  for (const contract of ["flex", "min-h-12", "whitespace-nowrap", "inset-x-2", "h-0.5"])
    assert.ok(webNav.includes(contract), contract);
  assert.match(web, /searchedPickupLocation/);
});

test("Compare uses the refined native presentation while Pickup retains its geometry", () => {
  for (const contract of ["paddingTop:12", "paddingBottom:28"])
    assert.ok(style("compare").includes(contract));
  for (const contract of ["fontSize:20", "lineHeight:28", 'fontWeight:"800"'])
    assert.ok(style("heading").includes(contract));
  for (const contract of ["fontSize:18", "lineHeight:24", 'fontWeight:"600"', "fontFamily:appFonts.semibold", "letterSpacing:-.25"])
    assert.ok(style("compareHeading").includes(contract));
  for (const contract of ["marginTop:4", "fontSize:14", "lineHeight:20", 'fontWeight:"500"'])
    assert.ok(style("stay").includes(contract));
  for (const contract of ["marginTop:20", "borderRadius:14", "paddingHorizontal:8", "paddingVertical:16"])
    assert.ok(style("compareCard").includes(contract));
  assert.doesNotMatch(style("compareCard"), /marginHorizontal:-/);
  assert.match(native, /logo:\{width:108,height:24,flexShrink:0\}/);
  assert.match(native, /radio:\{width:16,height:16,borderRadius:8,borderWidth:1\.5/);
  assert.match(native, /radioDot:\{width:6,height:6,borderRadius:3/);
  assert.match(native, /primaryValidCarOffer\(result\.offers\)/);

  for (const contract of ["paddingVertical:20", "borderTopWidth:1", "borderBottomWidth:1"])
    assert.ok(style("pickupSection").includes(contract));
  for (const contract of ["fontSize:18", "lineHeight:24", 'fontWeight:"700"'])
    assert.ok(style("pickupHeading").includes(contract));
  for (const contract of ["fontSize:16", "lineHeight:24", 'fontWeight:"700"'])
    assert.ok(style("timelineHeading").includes(contract));
  assert.match(native, /<MapPin size=\{16\} color="#004BB8"/);
  assert.match(native, /<Clock3 size=\{16\} color=\{theme\.dark\?theme\.icon:"#64748B"\}/);
});

test("Compare benefits are stationary and wrap as whole readable items", () => {
  const compareStart = native.indexOf("function Compare(");
  const compareEnd = native.indexOf("function TimelineEntry", compareStart);
  const compare = native.slice(compareStart, compareEnd);
  assert.match(compare, /<View style=\{s\.benefits\}>/);
  for (const scrollingContract of [/<ScrollView/, /\bhorizontal\b/, /showsHorizontalScrollIndicator/, /scrollEnabled/, /onScroll/, /scrollTo/])
    assert.doesNotMatch(compare, scrollingContract);

  for (const contract of ["flex:1", "minWidth:0", 'flexDirection:"row"', 'flexWrap:"wrap"', "rowGap:8", "columnGap:12"])
    assert.ok(style("benefits").includes(contract), contract);
  for (const contract of ['flexDirection:"row"', 'alignItems:"center"', "flexShrink:0"])
    assert.ok(style("benefit").includes(contract), contract);
  assert.match(compare, /<Text numberOfLines=\{1\} style=\{s\.benefitText\}>\{label\}<\/Text>/);
  assert.doesNotMatch(compare, /ellipsizeMode|adjustsFontSizeToFit|minimumFontScale/);
  for (const contract of ["fontSize:11", 'fontWeight:"600"', "fontFamily:appFonts.semibold"])
    assert.ok(style("benefitText").includes(contract), contract);

  for (const contract of ["marginTop:20", 'flexDirection:"row"', 'alignItems:"flex-end"', "gap:10"])
    assert.ok(style("compareBottom").includes(contract), contract);
  for (const contract of ["flexShrink:0", 'alignItems:"flex-end"'])
    assert.ok(style("comparePrice").includes(contract), contract);
  assert.match(compare, /<View style=\{s\.comparePrice\}><Text style=\{s\.daily\}>[\s\S]*<Text style=\{s\.perDay\}>per day<\/Text><\/View>/);
});

test("Compare alone uses the singular unlimited-mile benefit copy", () => {
  assert.match(native, /<Spec Icon=\{Gauge\} text=\{nativeCarMileageLabel\(result\)\}/);
  assert.match(native, /const compareMileageLabel=result\.mileagePolicy==="unlimited"\?"Unlimited mile":nativeCarMileageLabel\(result\)/);
  const compareStart = native.indexOf("function Compare(");
  const factsStart = native.indexOf("const facts=", compareStart);
  const factsEnd = native.indexOf(" as const", factsStart);
  const facts = native.slice(factsStart, factsEnd);
  const ordered = ["ShieldCheck", "nativeCarFuelPolicyLabel", "Gauge", "compareMileageLabel"].map(contract => facts.indexOf(contract));
  assert.ok(ordered.every(index => index >= 0));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
  assert.equal(nativeCarMileageLabel({ mileagePolicy: "unlimited" } as CarResult), "Unlimited mileage");
  assert.equal(nativeCarMileageLabel({ mileagePolicy: "limited", limitedMileageKm: 300 } as CarResult), "300 km included");
});

test("Location uses search truth and a dedicated text-only timeline", () => {
  assert.match(native, /searchedPickupLocation=search\.pickupLocation\.trim\(\)/);
  assert.match(native, /searchedReturnLocation=search\.dropoffLocation\.trim\(\)/);
  assert.match(native, /pickupLocation=searchedPickupLocation\|\|result\.pickupLocation/);
  assert.match(native, /returnLocation=searchedReturnLocation\|\|result\.returnLocation/);
  assert.match(native, /function LocationTimelineEntry/);
  assert.match(native, /<LocationTimelineEntry label="PICK-UP" location=\{pickupLocation\}/);
  assert.doesNotMatch(native.match(/function LocationTimelineEntry[\s\S]*?function PickupReturn/)?.[0] ?? "", /<MapPin|<Clock3/);
  for (const contract of ["fontSize:12", 'fontWeight:"700"'])
    assert.ok(style("locationTimelineLabel").includes(contract));
  for (const contract of ["fontSize:14", 'fontWeight:"600"'])
    assert.ok(style("locationTimelineLocation").includes(contract));
  assert.ok(style("locationTimelineDate").includes("fontSize:12"));
  assert.ok(style("mapViewport").includes("height:200"));
  assert.ok(style("mapCard").includes("marginTop:16"));
  assert.ok(style("mapCard").includes("borderRadius:14"));
  assert.ok(style("directions").includes("minHeight:44"));
  assert.match(native, /Platform\.OS!=="ios"&&directions\?<Pressable accessibilityRole="link"/);
});

test("directions normalize the resolved destination without a mobile credential", () => {
  const url = nativeCarDirectionsUrl("  Paris   City Centre, Paris  ");
  assert.ok(url);
  assert.equal(new URL(url).searchParams.get("destination"), "Paris City Centre, Paris");
  assert.equal(nativeCarDirectionsUrl("   "), null);
  assert.doesNotMatch(native, /EXPO_PUBLIC_GOOGLE_MAPS|googleKey/);
});
