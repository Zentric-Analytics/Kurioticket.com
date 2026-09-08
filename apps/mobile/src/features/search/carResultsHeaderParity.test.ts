import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLocationFieldDisplay } from "../../../../../src/lib/search/locationFieldDisplay";

const cars = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
const carAlert = readFileSync("src/features/search/NativeCarPriceAlert.tsx", "utf8");
const hotels = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const carHeader = cars.slice(cars.indexOf("function CarResultsHeader"), cars.indexOf("function CarSkeletons"));
const hotelHeader = hotels.slice(hotels.indexOf("function HotelResultsHeader"), hotels.indexOf("const HotelResultsShortcut"));

test("Cars Results replaces branded chrome with two Hotel-style header targets", () => {
  assert.doesNotMatch(cars, /import[^\n]*\bTopBar\b|<TopBar(?:\s|\/|>)/);
  assert.doesNotMatch(cars, /import \{ BottomNav \}|<BottomNav(?:\s|\/|>)/);
  assert.doesNotMatch(carHeader, /Logo|Kurioticket|Bell|Notifications|notification badge|profile|menu/i);
  assert.match(carHeader, /accessibilityLabel="Go back"[^]*?onPress=\{\(\)=>router\.back\(\)\}[^]*?<ArrowLeft/);
  assert.match(carHeader, /accessibilityLabel=\{`Edit car search\. \$\{destination\}\. \$\{secondaryLine\}`\} onPress=\{onEdit\}/);
  assert.equal((carHeader.match(/<Pressable/g) ?? []).length, 2);
});

test("Cars header uses compact safe-area-aware Hotel geometry", () => {
  for (const contract of [/paddingLeft:Math\.max\(insets\.left\+6,6\)/,/carHeaderMainRow:\{width:"100%",flexDirection:"row",alignItems:"center",gap:6\}/,/carHeaderSide:\{width:44,flexShrink:0\}/,/carHeaderBack:\{width:44,height:44/,/carSummaryCard:\{flex:1,minWidth:0,minHeight:62/,/carSummaryEditSlot:\{width:44,height:44,flexShrink:0/]) assert.match(cars, contract);
});
test("Cars summary uses compact typography and independent ellipsis", () => {
 assert.match(cars,/carSummaryDestination:\{fontSize:14,lineHeight:18/); assert.match(cars,/carSummarySecondary:\{marginTop:3,fontSize:10\.5,lineHeight:14/); assert.equal((carHeader.match(/numberOfLines=\{1\} ellipsizeMode="tail"/g)??[]).length,2); assert.doesNotMatch(carHeader,/position:\s*"absolute"|marginLeft:\s*-/);
});

test("Cars summary remains derived from canonical search data", () => {
  assert.match(cars, /canonicalPickupLocation=String\(payload\.pickupLocation\|\|""\)/);
  assert.match(cars, /carSummaryDestination=getLocationFieldDisplay\(canonicalPickupLocation\)\.primary/);
  assert.match(cars, /payload\.pickupDate/);
  assert.match(cars, /payload\.pickupTime/);
  assert.match(cars, /payload\.dropoffDate/);
  assert.match(cars, /payload\.dropoffTime/);
  assert.match(cars, /carSummarySecondary=formatCarResultsScheduleSummary/);
  const summaryBuilder = cars.slice(cars.indexOf("const carSummarySecondary"), cars.indexOf("const edit="));
  assert.doesNotMatch(summaryBuilder, /driverAge|Any age|years old/);
  assert.doesNotMatch(cars, /Paris, France|Sep 6|20 years old/);
  assert.match(cars, /<CarEditSearchModal visible=\{carEditSearchOpen\} params=\{params\}/);
});

test("Cars summary compacts the displayed city without mutating its canonical value", () => {
  const canonical = "Paris, France";
  const destination = getLocationFieldDisplay(canonical).primary;
  assert.equal(destination, "Paris");
  assert.equal(canonical, "Paris, France");
});

test("Cars render the full filtered result set without pagination", () => {
  assert.match(cars, /carResultCountLabel\(filtered\.length\)/);
  assert.match(cars, /filtered\.map\(\(result,index\)/);
  assert.match(cars, /rank=\{index\}/);
  assert.doesNotMatch(cars, /const \[page|pageSize|totalPages|filtered\.slice|Page \{page\}|label="Previous"|label="Next"/);
});

test("Cars result summary matches Hotel typography and grammar", () => {
  assert.match(cars, /const carResultCountLabel = \(count: number\) => `\$\{count\} \$\{count === 1 \? "Result" : "Results"\} found`/);
  assert.match(cars, /<Text accessibilityRole="header" style=\{\[r\.carResultCount,\{color:theme\.textPrimary\}\]\}>\{carResultCountLabel\(filtered\.length\)\}<\/Text>/);
  assert.match(cars, /carResultCount:\{fontSize:13,lineHeight:17,fontWeight:"700",fontFamily:appFonts\.bold\}/);
  assert.doesNotMatch(cars, /carResultCount:\{[^}]*fontWeight:"800"/);
  assert.match(hotels, /flightResultCount: \{ fontSize: 13, lineHeight: 17, fontWeight: "700", fontFamily: appFonts\.bold \}/);
});

test("Cars use one truthful compact price alert before the summary and cards", () => {
  assert.equal((cars.match(/<NativeCarPriceAlert/g) ?? []).length, 1);
  assert.ok(cars.indexOf("<NativeCarPriceAlert") < cars.indexOf("<View accessibilityLabel=\"Car results summary\""));
  assert.ok(cars.indexOf("<View accessibilityLabel=\"Car results summary\"") < cars.indexOf("<CarResultCard"));
  assert.match(cars, /carFilterSectionHeader:\{paddingBottom:12\}/);
  assert.match(hotels, /hotelFilterSectionHeader: \{ paddingBottom: 12 \}/);
  assert.match(cars, /body:\{paddingHorizontal:10,gap:14\}/);
  assert.match(carAlert, /<Bell/); assert.match(carAlert, /<Switch/); assert.match(carAlert, /Track rental car prices/);
  assert.doesNotMatch(carAlert, /numberOfLines=\{1\}/);
  assert.match(carAlert, /accessibilityLabel="Track rental car prices"/);
  assert.match(carAlert, /backgroundColor: theme\.priceAlertSurface, borderColor: theme\.priceAlertBorder/);
  assert.match(carAlert, /<Bell[^>]*color=\{theme\.priceAlertAccent\}/);
  assert.match(carAlert, /<ActivityIndicator[^>]*color=\{theme\.priceAlertAccent\}/);
  assert.match(carAlert, /styles\.title, \{ color: theme\.textPrimary \}/);
  assert.match(carAlert, /control: \{ width: "100%", minHeight: 52, borderRadius: 12, borderWidth: 1/);
  assert.match(carAlert, /switch: \{ minWidth: 51, minHeight: 44, flexShrink: 0/);
  assert.match(carAlert, /pending \|\| loading \? <ActivityIndicator[\s\S]*?<Switch/);
  assert.match(carAlert, /travelApi\.priceAlerts\(\)/); assert.match(carAlert, /updatePriceAlertStatus/); assert.match(carAlert, /createPriceAlert/);
  assert.match(carAlert, /accessibilityState=\{\{ checked: tracking, disabled, busy: pending \|\| loading \}\}/);
  assert.doesNotMatch(carAlert, /not available yet/);
  assert.match(hotels, /compactPriceAlertSwitchSlot: \{ minWidth: 51, minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 \}/);
});


test("Cars Filter uses the Hotel SlidersHorizontal icon contract", () => {
  assert.match(cars, /<CarResultsShortcut label="Filter" accessibilityLabel="Filters"[^>]*icon showChevron=\{false\}/);
  assert.match(cars, /<SlidersHorizontal accessible=\{false\} size=\{16\} strokeWidth=\{2\.2\} color=\{active\?ui\.blue:theme\.icon\}/);
  assert.doesNotMatch(cars, /<FlowIcon name="sliders"/);
  assert.match(cars, /<FlowIcon name="chevronDown"/);
});

test("Cars target sheet uses one immediate accessible close path", () => {
  assert.match(carAlert, /<View style=\{styles\.sheetHeader\}>[\s\S]*Track rental car prices[\s\S]*<Pressable accessibilityRole="button" accessibilityLabel="Close price alert"/);
  assert.match(carAlert, /<X accessible=\{false\} size=\{22\} color=\{theme\.icon\}/);
  assert.match(carAlert, /sheetHeaderTitle: \{ flex: 1, minWidth: 0 \}/);
  assert.match(carAlert, /sheetClose: \{ width: 44, height: 44/);
  assert.doesNotMatch(carAlert, /<Button label="Cancel"/);
  const close = carAlert.slice(carAlert.indexOf("const closeTargetSheet"), carAlert.indexOf("const toggle"));
  assert.match(close, /setOpen\(false\); Keyboard\.dismiss\(\);/);
  assert.doesNotMatch(close, /async|await|setTimeout|InteractionManager|keyboardDidHide/);
  assert.match(carAlert, /animationType="none"/);
  assert.match(carAlert, /onRequestClose=\{\(\) => \{ if \(!pending\) closeTargetSheet\(\); \}\}/);
  assert.match(carAlert, /onPress=\{closeTargetSheet\}/);
  assert.equal(carAlert.match(/closeTargetSheet/g)?.length, 3);
});
