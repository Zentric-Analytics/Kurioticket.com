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

test("Cars inset only result cards and matching transition skeletons", () => {
  assert.match(cars, /body:\{paddingHorizontal:14,gap:14\}/);
  assert.match(cars, /carResultCardSlot:\{marginHorizontal:0\}/);
  const slot = cars.match(/carResultCardSlot:\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(slot, /(?:minW|w|W)idth|position|absolute|transform|margin(?:Horizontal)?:-|Dimensions|window|screen/);
  assert.doesNotMatch(cars, /carResultCardSlot:\{[^}]*width:"100%"|carResultCardSlot:\{[^}]*Dimensions/);
  assert.match(cars, /filtered\.map\(\(result,index\)=><View key=\{result\.id\} style=\{r\.carResultCardSlot\}><CarResultCard result=\{result\} rank=\{index\} imageUri=\{image\(result\.imageUrl\)\} searchParams=\{payload\} onViewDeal=\{\(\)=>openDeal\(result\)\}\/><\/View>\)/);
  assert.match(cars, /style=\{\[r\.skeleton,r\.carResultCardSlot,\{backgroundColor:/);
  assert.doesNotMatch(cars, /<NativeCarPriceAlert[^>]*carResultCardSlot|<View accessibilityLabel="Car results summary"[^>]*carResultCardSlot/);
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
  assert.match(cars, /body:\{paddingHorizontal:14,gap:14\}/);
  assert.match(carAlert, /<Bell/); assert.match(carAlert, /<Switch/); assert.match(carAlert, /Track rental car prices/);
  assert.doesNotMatch(carAlert, /numberOfLines=\{1\}/);
  assert.match(carAlert, /accessibilityLabel="Track rental car prices"/);
  assert.match(carAlert, /backgroundColor: theme\.priceAlertSurface, borderColor: theme\.priceAlertBorder/);
  assert.match(carAlert, /<Bell[^>]*color=\{theme\.priceAlertAccent\}/);
  assert.match(carAlert, /<ActivityIndicator[^>]*color=\{theme\.priceAlertAccent\}/);
  assert.match(carAlert, /styles\.title, \{ color: theme\.textPrimary \}/);
  assert.match(carAlert, /control: \{ width: "100%", minHeight: 52, borderRadius: 12, borderWidth: 1/);
  assert.match(carAlert, /switch: \{ minWidth: 51, minHeight: 44, flexShrink: 0/);
  assert.match(carAlert, /travelApi\.priceAlerts\(\)/); assert.match(carAlert, /updatePriceAlertStatus/); assert.match(carAlert, /createPriceAlert/);
  assert.doesNotMatch(carAlert, /not available yet/);
  assert.match(hotels, /compactPriceAlertSwitchSlot: \{ minWidth: 51, minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 \}/);
});

test("Cars Price Alert keeps focus reconciliation silent while mutation progress remains visible", () => {
  assert.match(carAlert, /const reconcile = useCallback\(async \(\) => \{[^\n]*setLoading\(true\)/);
  assert.match(carAlert, /useFocusEffect\(useCallback\(\(\) => \{ void reconcile\(\); \}, \[reconcile\]\)\)/);
  assert.match(carAlert, /\{pending \? <ActivityIndicator[^>]*color=\{theme\.priceAlertAccent\}[^>]*\/> : null\}<Switch/);
  assert.doesNotMatch(carAlert, /pending \|\| loading \? <ActivityIndicator/);
  assert.doesNotMatch(carAlert, /loading[^?\n]*\? <ActivityIndicator/);
  assert.match(carAlert, /accessibilityState=\{\{ checked: tracking, disabled, busy: pending \}\}/);
  assert.doesNotMatch(carAlert, /busy: pending \|\| loading/);
});

test("Cars Price Alert reconciliation remains race-safe and preserves its known match", () => {
  assert.match(carAlert, /const disabled = pending \|\| loading \|\| \(!available && !tracking\)/);
  assert.match(carAlert, /if \(!plan \|\| pending \|\| loading\) return/);
  assert.doesNotMatch(carAlert, /setLoading\(true\);\s*setMatch\(undefined\)/);
});

test("Cars Price Alert keeps user mutation progress and create feedback", () => {
  assert.match(carAlert, /const toggle = async[\s\S]*setPending\(true\)[\s\S]*updatePriceAlertStatus[\s\S]*setPending\(false\)/);
  assert.match(carAlert, /const create = async[\s\S]*setPending\(true\)[\s\S]*createPriceAlert[\s\S]*setPending\(false\)/);
  assert.match(carAlert, /label=\{pending \? "Creating…" : "Create alert"\}/);
});


test("Cars quick controls use the Flight-family icon, geometry, and surface contract", () => {
  const railStart = cars.indexOf("<ScrollView horizontal");
  const railOpeningTag = cars.slice(railStart, cars.indexOf(">", railStart) + 1);
  for (const contract of [
    /<ScrollView\s+horizontal/,
    /showsHorizontalScrollIndicator=\{false\}/,
    /alwaysBounceHorizontal=\{false\}/,
    /bounces=\{false\}/,
    /overScrollMode="never"/,
    /contentContainerStyle=\{r\.filters\}/,
  ]) assert.match(railOpeningTag, contract);
  assert.doesNotMatch(railOpeningTag, /scrollEnabled=\{false\}/);
  assert.match(cars, /<CarResultsShortcut label="Filter" accessibilityLabel="Filters"[^>]*icon showChevron=\{false\}/);
  assert.match(cars, /<SlidersHorizontal accessible=\{false\} size=\{16\} strokeWidth=\{2\.2\} color=\{foreground\}/);
  assert.doesNotMatch(cars, /<FlowIcon name="sliders"/);
  assert.match(cars, /<ChevronDown accessible=\{false\} size=\{13\} strokeWidth=\{1\.9\} color=\{chevron\}/);
  assert.doesNotMatch(cars, /<FlowIcon name="chevronDown"|#EDF4FF/);
  assert.match(cars, /filters:\{paddingLeft:8,paddingRight:16,gap:6/);
  assert.match(cars, /shortcut:\{height:36,[^}]*gap:4,[^}]*borderWidth:1,borderRadius:9,paddingHorizontal:10\}/);
  for (const token of ["#D8E1EC", "#142033", "#64748B", "#F8FAFC", "#F1F5F9", "#FFFFFF"]) assert.match(cars, new RegExp(token));
  assert.match(cars, /accessibilityState=\{\{expanded,selected:active\}\}/);
  assert.match(cars, /shortcutChevronExpanded:\{transform:\[\{rotate:"180deg"\}\]\}/);
});

test("Cars Results carries the Flight-family canvas without a white filter band", () => {
  assert.match(cars, /const CAR_RESULTS_LIGHT_CANVAS = "#F5F7FB"/);
  assert.match(cars, /const carCanvasColor = theme\.dark \? theme\.background : CAR_RESULTS_LIGHT_CANVAS/);
  assert.match(cars, /r\.safe,\{backgroundColor:carCanvasColor\}/);
  assert.match(cars, /<CarResultsHeader[^>]*backgroundColor=\{carCanvasColor\}/);
  assert.match(carHeader, /\{backgroundColor,paddingLeft:/);
  assert.match(cars, /r\.carFilterSectionHeader,\{backgroundColor:carCanvasColor\}/);
  assert.doesNotMatch(cars, /r\.filterRail,\{backgroundColor:theme\.dark\?theme\.surface:"#FFFFFF"\}/);
});

test("Cars Price Alert close is state-owned so keyboard teardown cannot race ahead of the target sheet", () => {
  assert.match(carAlert, /<View style=\{styles\.sheetHeader\}>[\s\S]*Track rental car prices[\s\S]*<Pressable accessibilityRole="button" accessibilityLabel="Close price alert"/);
  assert.match(carAlert, /<X accessible=\{false\} size=\{22\} color=\{theme\.icon\}/);
  assert.match(carAlert, /sheetHeaderTitle: \{ flex: 1, minWidth: 0 \}/);
  assert.match(carAlert, /sheetClose: \{ width: 44, height: 44/);
  assert.doesNotMatch(carAlert, /<Button label="Cancel"/);
  const close = carAlert.slice(carAlert.indexOf("const closeTargetSheet"), carAlert.indexOf("const toggle"));
  assert.match(close, /const closeTargetSheet = \(\) => \{ setOpen\(false\); \};/);
  assert.doesNotMatch(close, /Keyboard\.dismiss|\.blur\(|async|await|setTimeout|InteractionManager|keyboard(?:Did|Will)Hide|requestAnimationFrame/);
  assert.match(carAlert, /\{open \? <Modal visible transparent animationType="none"/);
  assert.doesNotMatch(carAlert, /<Modal visible=\{open\}/);
  assert.match(carAlert, /<KeyboardAvoidingView[^>]*behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}/);
  assert.match(carAlert, /<TextInput autoFocus/);
  assert.match(carAlert, /onRequestClose=\{\(\) => \{ if \(!pending\) closeTargetSheet\(\); \}\}/);
  assert.match(carAlert, /onPress=\{closeTargetSheet\}/);
  assert.equal(carAlert.match(/closeTargetSheet/g)?.length, 3);
});
