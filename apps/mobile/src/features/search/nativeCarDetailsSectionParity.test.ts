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

  const shellStart = native.indexOf("s.carsTabsShell");
  const rowStart = native.indexOf('<View accessibilityRole="tablist" style={[s.carsTabsRow', shellStart);
  const pageStart = native.indexOf("<View style={[s.page,{backgroundColor:carCanvasColor}]}", rowStart);
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
  assert.match(tablist, /onPress=\{\(\)=>selectCarTab\(tab\)\}/);
  assert.match(tablist, /accessibilityState=\{\{selected\}\}/);
  assert.match(tablist, /tab==="compare"\?"Compare deals"/);
});

test("the web tab reference remains the mobile parity contract", () => {
  for (const contract of ["flex", "min-h-12", "whitespace-nowrap", "inset-x-2", "h-0.5"])
    assert.ok(webNav.includes(contract), contract);
  assert.match(web, /searchedPickupLocation/);
});

test("content below the three tabs shares one section-heading hierarchy", () => {
  for (const contract of ["paddingTop:12", "paddingBottom:28"])
    assert.ok(style("compare").includes(contract));
  for (const contract of ["fontSize:20", "lineHeight:28", 'fontWeight:"800"'])
    assert.ok(style("heading").includes(contract));
  for (const heading of ["compareHeading", "pickupHeading", "locationHeading"]) {
    for (const contract of ["fontSize:14", "lineHeight:20", 'fontWeight:"700"', "fontFamily:appFonts.bold", "letterSpacing:-.2"])
      assert.ok(style(heading).includes(contract), `${heading}: ${contract}`);
  }
  assert.match(native, /<Text style=\{\[s\.compareHeading,[^>]*>Compare deals<\/Text>/);
  assert.match(native, /<Text style=\{\[s\.pickupHeading,[^>]*>Pickup and return<\/Text>/);
  assert.match(native, /<Text style=\{\[s\.locationHeading,[^>]*>Location<\/Text>/);
  for (const contract of ["marginTop:4", "fontSize:12", "lineHeight:18", 'fontWeight:"500"'])
    assert.ok(style("stay").includes(contract));
  for (const contract of ["marginTop:20", "gap:10"])
    assert.ok(style("dealList").includes(contract));
  for (const contract of ["borderRadius:14", "paddingHorizontal:8", "paddingVertical:12", 'overflow:"hidden"'])
    assert.ok(style("compareCard").includes(contract));
  assert.doesNotMatch(style("compareCard"), /marginHorizontal:-|marginTop:20/);
  assert.match(native, /logo:\{width:108,height:24,flexShrink:0\}/);
  assert.match(native, /radio:\{width:16,height:16,borderRadius:8,borderWidth:1\.5/);
  assert.match(native, /radioDot:\{width:6,height:6,borderRadius:3/);
  assert.match(native, /comparisonCarOffers\(result\.offers\)/);
  assert.match(native, /primaryValidCarOffer\(result\.offers\)/);

  for (const contract of ["paddingVertical:20", "borderTopWidth:1", "borderBottomWidth:1"])
    assert.ok(style("pickupSection").includes(contract));
  for (const contract of ["fontSize:16", "lineHeight:24", 'fontWeight:"700"', "fontFamily:appFonts.bold"])
    assert.ok(style("timelineHeading").includes(contract));
  for (const contract of ["fontSize:14", "lineHeight:20", 'fontWeight:"500"', "fontFamily:appFonts.medium"])
    assert.ok(style("timelineLocation").includes(contract));
  for (const contract of ["fontSize:14", "lineHeight:20", 'fontWeight:"400"', "fontFamily:appFonts.regular"])
    assert.ok(style("timelineDate").includes(contract));
  assert.ok(style("requirements").includes("marginTop:20"));
  for (const contract of ["fontSize:14", "lineHeight:20", 'fontWeight:"700"', "fontFamily:appFonts.bold"])
    assert.ok(style("requirementsHeading").includes(contract));
  for (const contract of ["marginTop:10", 'flexDirection:"row"', 'alignItems:"center"', "gap:10"])
    assert.ok(style("requirementRow").includes(contract), contract);
  for (const contract of ["fontSize:14", "lineHeight:20", 'fontWeight:"500"', "fontFamily:appFonts.medium"])
    assert.ok(style("requirementText").includes(contract), contract);
  assert.match(native, /<Text style=\{\[s\.requirementsHeading,[^>]*>Pickup requirements<\/Text>/);
  assert.match(native, /<IdCard size=\{19\}/);
  assert.match(native, />Valid driver's license<\/Text>/);
  assert.match(native, /<MapPin size=\{16\} color="#004BB8"/);
  assert.match(native, /<Clock3 size=\{16\} color=\{theme\.dark\?theme\.icon:"#64748B"\}/);
});

test("Compare deals renders compact selectable real-price cards and leaves totals to the dock", () => {
  const compareStart = native.indexOf("function Compare(");
  const compareEnd = native.indexOf("function TimelineEntry", compareStart);
  const compare = native.slice(compareStart, compareEnd);

  assert.match(compare, /accessibilityRole="radiogroup" accessibilityLabel="Car deal options"/);
  assert.match(compare, /offers\.map\(offer=>/);
  assert.match(compare, /accessibilityRole="radio" accessibilityState=\{\{selected\}\}/);
  assert.match(compare, /onPress=\{\(\)=>onSelectOffer\(offer\.id\)\}/);
  assert.match(compare, /offer\.freeCancellation\?"Free cancellation":"Non-refundable"/);
  assert.match(compare, /nativeCarFuelPolicyLabel\(result\.fuelPolicy\)/);
  assert.match(compare, /result\.mileagePolicy==="unlimited"\?"Unlimited mileage":nativeCarMileageLabel\(result\)/);
  assert.match(compare, /money\(offer\.currency,offer\.pricePerDay\)/);
  assert.doesNotMatch(compare, /offer\.totalPrice|Taxes & fees included|Car supplied by:|Pay at pickup|Mobile deal|Book<|View deal|Reserve/);

  for (const contract of ["marginTop:12", 'flexDirection:"row"', 'alignItems:"flex-end"', "gap:10"])
    assert.ok(style("compareBottom").includes(contract), contract);
  for (const contract of ["flex:1", "minWidth:0", 'flexDirection:"row"', 'flexWrap:"wrap"', "columnGap:10", "rowGap:7"])
    assert.ok(style("benefits").includes(contract), contract);
  for (const contract of ['flexDirection:"row"', 'alignItems:"center"', "gap:3", "flexShrink:0"])
    assert.ok(style("benefit").includes(contract), contract);
  for (const contract of ["flexShrink:0", 'alignItems:"flex-end"'])
    assert.ok(style("comparePrice").includes(contract), contract);
});

test("Compare deals keeps the full unlimited-mile copy used elsewhere", () => {
  assert.match(native, /<Spec Icon=\{Gauge\} text=\{nativeCarMileageLabel\(result\)\}/);
  assert.match(native, /const compareMileageLabel=result\.mileagePolicy==="unlimited"\?"Unlimited mileage":nativeCarMileageLabel\(result\)/);
  assert.equal(nativeCarMileageLabel({ mileagePolicy: "unlimited" } as CarResult), "Unlimited mileage");
  assert.equal(nativeCarMileageLabel({ mileagePolicy: "limited", limitedMileageKm: 300 } as CarResult), "300 km included");
});

test("Pickup and Location use the same item hierarchy without changing map truth", () => {
  assert.match(native, /searchedPickupLocation=search\.pickupLocation\.trim\(\)/);
  assert.match(native, /searchedReturnLocation=search\.dropoffLocation\.trim\(\)/);
  assert.match(native, /pickupLocation=searchedPickupLocation\|\|result\.pickupLocation/);
  assert.match(native, /returnLocation=searchedReturnLocation\|\|result\.returnLocation/);
  assert.match(native, /function LocationTimelineEntry/);
  assert.match(native, /<LocationTimelineEntry label="Pick-up" location=\{pickupLocation\}/);
  assert.match(native, /<LocationTimelineEntry label="Return" location=\{returnLocation\}/);
  assert.doesNotMatch(native, /<LocationTimelineEntry label="PICK-UP"|<LocationTimelineEntry label="RETURN"/);
  const locationEntry = native.match(/function LocationTimelineEntry[\s\S]*?function PickupReturn/)?.[0] ?? "";
  assert.doesNotMatch(locationEntry, /<MapPin|<Clock3/);
  assert.match(locationEntry, /s\.timelineHeading/);
  assert.match(locationEntry, /s\.timelineLocation/);
  assert.match(locationEntry, /s\.timelineDate/);
  for (const contract of ["fontSize:15", "lineHeight:22", 'fontWeight:"700"', "fontFamily:appFonts.bold"])
    assert.ok(style("detailsHeading").includes(contract));
  for (const contract of ["fontSize:14", "lineHeight:20", 'fontWeight:"400"', "fontFamily:appFonts.regular"])
    assert.ok(style("bulletText").includes(contract));
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
