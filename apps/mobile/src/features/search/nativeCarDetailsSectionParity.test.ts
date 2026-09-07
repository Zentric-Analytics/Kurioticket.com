import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { nativeCarDirectionsUrl } from "./nativeCarDetailsModel";

const native = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const route = readFileSync("app/car-details.tsx", "utf8");
const web = readFileSync("../../src/components/results/CarDetailsClient.tsx", "utf8");
const webNav = readFileSync("../../src/components/results/carDetails/CarDetailsSectionNav.tsx", "utf8");

function style(name: string): string {
  const match = native.match(new RegExp(`${name}:\\{([^}]+)\\}`));
  assert.ok(match, `missing ${name} style`);
  return match[1];
}

test("the live route owns one explicit, non-wrapping three-tab row", () => {
  assert.match(route, /ApprovedCarDetailScreen/);
  assert.match(native, /\(\["compare","pickup","location"\] as const\)/);
  assert.equal((native.match(/accessibilityRole="tablist"/g) ?? []).length, 1);
  assert.match(native, /<Text numberOfLines=\{1\}/);

  const tabs = style("tabs");
  for (const contract of [
    'width:"100%"', "minHeight:48", 'flexDirection:"row"',
    'flexWrap:"nowrap"', 'alignItems:"stretch"', 'justifyContent:"space-between"',
  ]) assert.ok(tabs.includes(contract), contract);
  assert.ok(!tabs.includes('flexDirection:"column"'));

  const tab = style("tab");
  for (const contract of ["flexGrow:1", "flexShrink:1", "flexBasis:0", "minWidth:0", "minHeight:48"])
    assert.ok(tab.includes(contract), contract);
  assert.ok(!tab.includes('width:"100%"'));
  assert.ok(!tab.includes('flexBasis:"100%"'));

  const underline = style("underline");
  for (const contract of ["left:8", "right:8", "bottom:0", "height:2"])
    assert.ok(underline.includes(contract), contract);
  assert.match(native, /backgroundColor:selected\?"#075EE8":"transparent"/);
});

test("the web tab reference remains the mobile parity contract", () => {
  for (const contract of ["flex", "min-h-12", "whitespace-nowrap", "inset-x-2", "h-0.5"])
    assert.ok(webNav.includes(contract), contract);
  assert.match(web, /searchedPickupLocation/);
});

test("Compare and Pickup retain the web-aligned geometry", () => {
  for (const contract of ["paddingTop:12", "paddingBottom:28"])
    assert.ok(style("compare").includes(contract));
  for (const contract of ["fontSize:20", "lineHeight:28", 'fontWeight:"800"'])
    assert.ok(style("heading").includes(contract));
  for (const contract of ["marginTop:4", "fontSize:14", "lineHeight:20", 'fontWeight:"500"'])
    assert.ok(style("stay").includes(contract));
  for (const contract of ["marginHorizontal:-12", "marginTop:20", "borderRadius:14", "paddingHorizontal:8", "paddingVertical:16"])
    assert.ok(style("compareCard").includes(contract));
  assert.match(native, /logo:\{width:146,height:32\}/);
  assert.match(native, /radio:\{width:22,height:22/);
  assert.match(native, /radioDot:\{width:10,height:10/);
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
});

test("directions normalize the resolved destination without a mobile credential", () => {
  const url = nativeCarDirectionsUrl("  Paris   City Centre, Paris  ");
  assert.ok(url);
  assert.equal(new URL(url).searchParams.get("destination"), "Paris City Centre, Paris");
  assert.equal(nativeCarDirectionsUrl("   "), null);
  assert.doesNotMatch(native, /EXPO_PUBLIC_GOOGLE_MAPS|googleKey/);
});
