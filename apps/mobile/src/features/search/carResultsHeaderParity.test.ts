import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLocationFieldDisplay } from "../../../../../src/lib/search/locationFieldDisplay";

const cars = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
const carAlert = readFileSync("src/features/search/NativeCarPriceAlert.tsx", "utf8");
const hotels = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const carHeader = cars.slice(cars.indexOf("function CarResultsHeader"), cars.indexOf("function CarResultItemSeparator"));
const hotelHeader = hotels.slice(hotels.indexOf("function HotelResultsHeader"), hotels.indexOf("const HotelResultsShortcut"));
const carAlertModal = carAlert.slice(carAlert.indexOf("{open ? <Modal"), carAlert.indexOf("</Modal> : null}"));

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
test("native Cars header has the mobile-web white surface, 28px left curve and muted underlay", () => {
  assert.match(cars, /const CAR_RESULTS_LIGHT_CANVAS = "#F5F7FB"/);
  assert.match(cars, /const headerSurfaceColor = theme\.dark \? theme\.background : "#FFFFFF"/);
  assert.match(cars, /<SafeAreaView style=\{\[r\.safe,\{backgroundColor:headerSurfaceColor\}\]\} edges=\{\["top"\]\}>/);
  assert.match(cars, /<View style=\{\[r\.carHeaderBackdrop,\{backgroundColor:carCanvasColor\}\]\}>/);
  assert.match(cars, /<View style=\{\[r\.carHeaderSurface,\{backgroundColor:headerSurfaceColor,borderBottomColor:theme\.dark\?theme\.border:"#D8E1EC"\}\]\}>/);
  assert.match(cars, /carHeaderSurface:\{borderBottomLeftRadius:28,borderBottomRightRadius:0,borderBottomWidth:StyleSheet\.hairlineWidth,overflow:"hidden"\}/);
  assert.match(cars, /carHeaderBackdrop:\{width:"100%"\}/);
  const search = cars.indexOf("<CarResultsHeader destination=");
  const filters = cars.indexOf("<View style={[r.carFilterSectionHeader", search);
  const list = cars.indexOf("<FlatList ref={carScrollRef}", filters);
  assert.ok(search > 0 && filters > search && list > filters);
  assert.match(cars, /<CarResultsHeader[^>]*backgroundColor=\{headerSurfaceColor\}/);
  assert.match(cars, /r\.carFilterSectionHeader,\{backgroundColor:headerSurfaceColor\}/);
  assert.match(cars, /<FlatList ref=\{carScrollRef\} style=\{\{backgroundColor:carCanvasColor\}\}/);
  assert.doesNotMatch(carHeader, /profile|hamburger|menu/i);
});

test("native Cars rail matches the mobile-web full-height spacing and 28px curve", () => {
  assert.match(cars, /carHeaderSurface:\{borderBottomLeftRadius:28,borderBottomRightRadius:0,borderBottomWidth:StyleSheet\.hairlineWidth,overflow:"hidden"\}/);
  assert.match(cars, /carFilterSectionHeader:\{paddingTop:8,paddingBottom:8\}/);
  assert.match(cars, /filterRail:\{height:44,flexGrow:0,flexShrink:0\}/);
  assert.match(cars, /filters:\{paddingLeft:12,paddingRight:16,gap:6,alignItems:"center",flexWrap:"nowrap"\}/);
  assert.match(cars, /shortcutTouchTarget:\{minWidth:44,minHeight:44,justifyContent:"center"\}/);
  assert.match(cars, /shortcut:\{height:36,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:4,borderWidth:1,borderRadius:9,paddingHorizontal:10\}/);
  assert.match(cars, /r\.carHeaderBackdrop,\{backgroundColor:carCanvasColor\}/);
  assert.match(cars, /r\.carFilterSectionHeader,\{backgroundColor:headerSurfaceColor\}/);
  assert.match(cars, /const CAR_RESULTS_LIGHT_CANVAS = "#F5F7FB"/);
  assert.match(cars, /const headerSurfaceColor = theme\.dark \? theme\.background : "#FFFFFF"/);
  assert.doesNotMatch(carHeader, /profile|hamburger|menu/i);
  const railHeight = 8 + 44 + 8;
  assert.equal(railHeight, 60, "native rail height must match the 60px mobile-web rail");
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
  assert.match(cars, /const listData=status==="ready"&&!carResultsApplying\?filtered:\[\]/);
  assert.match(cars, /data=\{listData\}/);
  assert.match(cars, /renderItem=\{\(\{item,index\}\)=>/);
  assert.match(cars, /rank=\{index\}/);
  assert.doesNotMatch(cars, /const \[page|pageSize|totalPages|filtered\.slice|Page \{page\}|label="Previous"|label="Next"/);
});

test("Cars keep a modest outer gutter while preserving result-card spacing with an item separator", () => {
  assert.match(cars, /body:\{paddingHorizontal:14\}/);
  assert.match(cars, /carResultCardSlot:\{marginHorizontal:0\}/);
  assert.match(cars, /ItemSeparatorComponent=\{CarResultItemSeparator\}/);
  assert.match(cars, /function CarResultItemSeparator\(\)\{return <View style=\{r\.carResultItemSeparator\}\/>;\}/);
  assert.match(cars, /carResultItemSeparator:\{height:14\}/);
  assert.doesNotMatch(cars, /body:\{paddingHorizontal:14,gap:/);
  const slot = cars.match(/carResultCardSlot:\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(slot, /(?:minW|w|W)idth|position|absolute|transform|margin(?:Horizontal)?:-|Dimensions|window|screen/);
  assert.doesNotMatch(cars, /carResultCardSlot:\{[^}]*width:"100%"|carResultCardSlot:\{[^}]*Dimensions/);
  assert.match(cars, /renderItem=\{\(\{item,index\}\)=><View style=\{r\.carResultCardSlot\}><CarResultCard result=\{item\} rank=\{index\} imageUri=\{resolveNativeCarImageUri\(item\.imageUrl\)\} searchParams=\{payload\} resultBackgroundColor=\{carCanvasColor\}\/><\/View>\}/);
  assert.match(cars, /style=\{\[r\.skeleton,r\.carResultCardSlot,\{backgroundColor:/);
  assert.match(cars, /skeleton:\{height:216/);
  assert.doesNotMatch(cars, /<NativeCarPriceAlert[^>]*carResultCardSlot|<View accessibilityLabel="Car results summary"[^>]*carResultCardSlot/);
});

test("Cars result summary keeps Hotel typography but owns a balanced non-floating rhythm", () => {
  assert.match(cars, /const carResultCountLabel = \(count: number\) => `\$\{count\} \$\{count === 1 \? "Result" : "Results"\} found`/);
  assert.match(cars, /<Text accessibilityRole="header" numberOfLines=\{1\} style=\{\[r\.carResultCount,\{color:theme\.textPrimary\}\]\}>\{carResultCountLabel\(filtered\.length\)\}<\/Text>/);
  assert.match(cars, /carResultCount:\{fontSize:13,lineHeight:17,fontWeight:"700",fontFamily:appFonts\.bold\}/);
  assert.match(cars, /carResultsSummaryRow:\{marginTop:2,marginBottom:2,minHeight:44,paddingHorizontal:8,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8\}/);
  assert.doesNotMatch(cars, /carResultsSummaryRow:\{[^}]*minHeight:38/);
  assert.match(cars, /carResultsSummaryRow:\{[^}]*alignItems:"center"/);
  assert.doesNotMatch(cars, /carResultsSummaryRow:\{[^}]*margin(?:Top|Bottom):-/);
  const previousHeight = 10 + 44 + 10;
  const compactHeight = 2 + 44 + 2;
  assert.equal(compactHeight, 48, "Cars results heading should match mobile-web row rhythm");
  assert.equal(previousHeight - compactHeight, 16, "reduce total extra breathing room by 16 points");
  assert.match(cars, /carResultCount:\{fontSize:13,lineHeight:17,fontWeight:"700",fontFamily:appFonts\.bold\}/);
  assert.match(cars, /carHeaderSurface:\{borderBottomLeftRadius:28,borderBottomRightRadius:0/);
  assert.doesNotMatch(cars, /carResultsCountColumn/);
  assert.match(cars, /body:\{paddingHorizontal:14\}/);
  assert.match(cars, /carResultItemSeparator:\{height:14\}/);
  assert.match(cars, /carResultCardSlot:\{marginHorizontal:0\}/);
  assert.doesNotMatch(cars, /carResultCount:\{[^}]*fontWeight:"800"/);
  assert.match(hotels, /flightResultCount: \{ fontSize: 13, lineHeight: 17, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(hotels, /hotelResultsSummaryRow: \{ minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 \}/);
  assert.match(hotels, /hotelResultsCountColumn: \{ flex: 1, minWidth: 0, justifyContent: "center" \}/);
  assert.match(hotels, /hotelResultsItemSeparator: \{ height: 14 \}/);
});

test("Cars Results places one compact price control alongside the count without a separate panel", () => {
  assert.equal((cars.match(/<NativeCarPriceAlert/g) ?? []).length, 1);
  const summary = cars.indexOf('<View accessibilityLabel="Car results summary"');
  const count = cars.indexOf('carResultCountLabel(filtered.length)', summary);
  const alertControl = cars.indexOf("<NativeCarPriceAlert", summary);
  const list = cars.indexOf("<FlatList ref={carScrollRef}");
  assert.ok(summary >= 0 && count > summary && alertControl > count);
  assert.ok(list > alertControl);
  assert.match(cars, /carFilterSectionHeader:\{paddingTop:8,paddingBottom:8\}/);
  assert.match(hotels, /hotelFilterSectionHeader: \{ paddingBottom: 12 \}/);
  assert.match(cars, /body:\{paddingHorizontal:14\}/);
  assert.match(cars, /carResultsSummaryRow:\{marginTop:2,marginBottom:2,minHeight:44,paddingHorizontal:8,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8\}/);
  assert.match(carAlert, /<Bell accessible=\{false\} size=\{16\}/);
  assert.match(carAlert, /<Pressable accessibilityRole="switch" accessibilityLabel="Track car prices"/);
  assert.match(carAlert, />Track car prices<\/Text>/);
  assert.match(carAlert, /numberOfLines=\{1\} ellipsizeMode="tail"/);
  assert.doesNotMatch(carAlert, /Track rental car prices|<Switch\b/);
  assert.doesNotMatch(carAlert, /styles\.control, \{ backgroundColor: theme\.priceAlertSurface/);
  assert.match(carAlert, /control: \{ flexShrink: 1, minWidth: 0, minHeight: 44/);
  assert.match(carAlert, /switchSlot: \{ width: 51, minHeight: 44, flexShrink: 0/);
  assert.match(carAlert, /switchTouchTarget: \{ width: 44, height: 44/);
  assert.match(carAlert, /switchTrack: \{ width: 44, height: 24/);
  assert.match(carAlert, /travelApi\.priceAlerts\(\)/);
  assert.match(carAlert, /updatePriceAlertStatus/);
  assert.match(carAlert, /createPriceAlert/);
  assert.doesNotMatch(carAlert, /not available yet/);
  assert.match(hotels, /compactPriceAlertSwitchSlot: \{ minWidth: 51, minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 \}/);
});

test("Cars Results gives handled child taps to its primary vertical scroll owner", () => {
  const resultsScrollStart = cars.indexOf("<FlatList ref={carScrollRef}");
  assert.notEqual(resultsScrollStart, -1);
  const contentStyleStart = cars.indexOf("contentContainerStyle=", resultsScrollStart);
  const resultsScrollOpeningTag = cars.slice(resultsScrollStart, cars.indexOf("/>", contentStyleStart) + 2);
  for (const contract of [
    /ref=\{carScrollRef\}/,
    /alwaysBounceVertical=\{false\}/,
    /bounces=\{false\}/,
    /overScrollMode="never"/,
    /keyboardShouldPersistTaps="handled"/,
    /contentContainerStyle=/,
  ]) assert.match(resultsScrollOpeningTag, contract);
  assert.doesNotMatch(resultsScrollOpeningTag, /keyboardShouldPersistTaps=(?:"always"|"never"|\{(?:true|false)\})/);

  const listHeaderStart = cars.indexOf("const listHeader=");
  const listHeaderEnd = cars.indexOf("const listEmpty=", listHeaderStart);
  const listHeader = cars.slice(listHeaderStart, listHeaderEnd);
  assert.ok(listHeader.indexOf("<View accessibilityLabel=\"Car results summary\"") < listHeader.indexOf("<NativeCarPriceAlert"));
  assert.match(resultsScrollOpeningTag, /renderItem=\{\(\{item,index\}\)=>[\s\S]*?<CarResultCard/);
});

test("Cars Price Alert keeps focus reconciliation silent while mutation progress stays non-visual", () => {
  assert.match(carAlert, /const reconcile = useCallback\(async \(\) => \{[\s\S]*?setLoading\(true\)/);
  assert.match(carAlert, /useFocusEffect\(useCallback\(\(\) => \{ void reconcile\(\); \}, \[reconcile\]\)\)/);
  assert.doesNotMatch(carAlert, /\bActivityIndicator\b|loadingSlot|animate-spin/);
  assert.match(carAlert, /pendingRef\.current = true/);
  assert.match(carAlert, /accessibilityState=\{\{ checked: tracking, disabled, busy: pending \}\}/);
  assert.doesNotMatch(carAlert, /busy: pending \|\| loading/);
});

test("Cars Price Alert reconciliation remains race-safe and preserves its known match", () => {
  assert.match(carAlert, /const disabled = loading \|\| !alertKnown \|\| \(!available && !tracking\)/);
  assert.doesNotMatch(carAlert, /const disabled = pending \|\|/);
  assert.match(carAlert, /matchingAlertState && matchingAlertState\.planKey === planKey/);
  assert.match(carAlert, /const reconciliation = \+\+reconciliationRef\.current/);
  assert.match(carAlert, /if \(reconciliation !== reconciliationRef\.current\) return/);
  assert.doesNotMatch(carAlert, /setLoading\(true\);\s*setCurrentMatchingAlert\(undefined\)/);
});

test("Cars Price Alert keeps automatic toggle request safety and feedback", () => {
  assert.match(carAlert, /const toggle = async[\s\S]*setPending\(true\)/);
  assert.match(carAlert, /travelApi\.createPriceAlert\(buildAutomaticCarPriceAlertPayload\(/);
  assert.match(carAlert, /travelApi\.updatePriceAlertStatus/);
  assert.match(carAlert, /showFeedback\(next \? "active" : "paused"\)/);
  assert.match(carAlert, /finally \{ pendingRef\.current = false; setPending\(false\); setOptimisticTracking\(null\); \}/);
  assert.match(carAlert, /onPress=\{\(\) => void toggle\(!tracking\)\}/);
  assert.doesNotMatch(carAlert, /const create = async|Create alert|Target rental total/);
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
  assert.match(cars, /<ChevronDown accessible=\{false\} size=\{13\} strokeWidth=\{1\.9\} color=\{chevron\} style=\{expanded\?r\.shortcutChevronExpanded:undefined\}/);
  assert.doesNotMatch(cars, /<FlowIcon name="chevronDown"|#EDF4FF/);
  assert.match(cars, /filters:\{paddingLeft:12,paddingRight:16,gap:6/);
  assert.match(cars, /shortcut:\{height:36,[^}]*gap:4,[^}]*borderWidth:1,borderRadius:9,paddingHorizontal:10\}/);
  for (const token of ["#D8E1EC", "#142033", "#64748B", "#F8FAFC", "#F1F5F9", "#FFFFFF"]) assert.match(cars, new RegExp(token));
  assert.match(cars, /accessibilityState=\{\{expanded,selected:active\}\}/);
  assert.match(cars, /shortcutChevronExpanded:\{transform:\[\{rotate:"180deg"\}\]\}/);
});

test("Cars Results keeps the mobile-web white chrome and muted search/body while preserving its native arrangement", () => {
  assert.match(cars, /const CAR_RESULTS_LIGHT_CANVAS = "#F5F7FB"/);
  assert.match(cars, /const carCanvasColor = theme\.dark \? theme\.background : CAR_RESULTS_LIGHT_CANVAS/);
  assert.match(cars, /const headerSurfaceColor = theme\.dark \? theme\.background : "#FFFFFF"/);
  assert.match(cars, /r\.safe,\{backgroundColor:headerSurfaceColor\}/);
  assert.match(cars, /<CarResultsHeader[^>]*backgroundColor=\{headerSurfaceColor\}/);
  assert.match(carHeader, /\{backgroundColor,paddingLeft:/);
  assert.match(cars, /r\.carFilterSectionHeader,\{backgroundColor:headerSurfaceColor\}/);
  assert.match(cars, /<FlatList ref=\{carScrollRef\} style=\{\{backgroundColor:carCanvasColor\}\}/);
  assert.match(cars, /r\.carSummaryCard,\{backgroundColor:theme\.dark\?theme\.surface:CAR_RESULTS_LIGHT_CANVAS/);
  assert.match(cars, /<CarResultCard[^>]*resultBackgroundColor=\{carCanvasColor\}/);
  assert.doesNotMatch(carHeader, /profile|hamburger|menu/i);
  assert.doesNotMatch(cars, /r\.filterRail,\{backgroundColor:theme\.dark\?theme\.surface:"#FFFFFF"\}/);
});

test("Cars Price Alert removes the manual target sheet and uses transient snackbar feedback", () => {
  assert.doesNotMatch(carAlert, /<Modal|<TextInput|KeyboardAvoidingView|Close price alert|closeTargetSheet|openTargetSheet|targetIntentRef|sheetHeader|sheetClose/);
  assert.match(carAlert, /export const CAR_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600/);
  assert.match(carAlert, /export function CarPriceAlertSnackbar/);
  assert.match(carAlert, /feedback === "active"/);
  assert.match(carAlert, /Price tracking is on/);
  assert.match(carAlert, /Price tracking is off/);
  assert.match(carAlert, /We'll notify you if the price drops\./);
  assert.match(carAlert, /You’ll no longer receive price-drop alerts for this rental\./);
  assert.match(carAlert, /accessibilityLabel="Manage price alerts"/);
  assert.match(carAlert, /router\.push\("\/price-alerts"\)/);
  assert.match(carAlert, /const dismissTimer = setTimeout/);
  assert.match(carAlert, /Animated\.timing\(opacity, \{ toValue: 0/);
  assert.match(carAlert, /if \(finished\) onDismiss\(feedback\)/);
  assert.match(carAlert, /clearTimeout\(dismissTimer\)/);
  assert.match(cars, /onDismiss=\{dismissPriceAlertFeedback\}/);
});
