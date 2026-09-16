import assert from "node:assert/strict";import{readFileSync}from"node:fs";import test from"node:test";
import ts from "typescript";

// Architecture contracts only; native keyboard interactions still need device QA.
test("Flight moves its whole popup with Cars-style keyboard avoidance", () => {
  assert.match(flight, /<KeyboardAvoidingView style=\{s0\.flightAlertTouchContent\} behavior=\{Platform\.OS === "ios" \? "padding" : "height"\} pointerEvents="box-none">\s*<View style=\{\[s0\.alertSheet, s0\.flightAlertSheet,/);
  assert.match(flight, /<TextInput autoFocus[\s\S]*<\/KeyboardAvoidingView>/);
  // Android height avoidance needs the full viewport rather than intrinsic card height.
  assert.match(source, /flightAlertTouchContent: \{ flex: 1, justifyContent: "flex-end" \}/);
  assert.match(flight, /marginBottom: Math\.max\(safeAreaInsets\.bottom, 12\)/);
});

test("Flight no longer anchors its popup independently of the keyboard", () => {
  assert.doesNotMatch(source, /flightPriceAlertGeometry|flightPriceAlertAnchorBottom|flightTargetAnchorBottom|Dimensions\.get\("screen"\)/);
  const viewport = source.match(/flightAlertTouchContent: \{([^}]*)\}/)?.[1];
  assert.ok(viewport);
  assert.doesNotMatch(viewport, /height:|position:|top:|bottom:|transform:/);
  assert.doesNotMatch(flight, /height:|keyboard(?:Did|Will)(?:Hide|Show)|Keyboard\.dismiss|\.blur\(|setTimeout|requestAnimationFrame|InteractionManager/);
});

test("Flight backdrop owns first touch behind the popup and supports accessibility escape", () => {
  assert.match(flight, /<View pointerEvents="none" style=\{\[StyleSheet\.absoluteFill, s0\.flightAlertScrim\]\}\/>\s*<Pressable accessible=\{false\} disabled=\{pending\} onPressIn=\{closeTargetSheet\} onPress=\{closeTargetSheet\} style=\{StyleSheet\.absoluteFill\}\/>\s*<KeyboardAvoidingView/);
  assert.match(flight, /onRequestClose=\{\(\) => \{ if \(!pending\) closeTargetSheet\(\); \}\}/);
  assert.match(flight, /onAccessibilityEscape=\{\(\) => \{ if \(!pending\) closeTargetSheet\(\); \}\}/);
  assert.match(flight, /accessibilityViewIsModal/);
  // Keep the shrinking Android viewport at the top; bottom alignment belongs inside it.
  assert.match(source, /flightAlertOverlay: \{ flex: 1 \}/);
  assert.match(source, /flightAlertScrim: \{ backgroundColor: "rgba\(0,0,0,\.45\)" \}/);
});

test("Flight Results preserves handled keyboard taps on the exact owning SectionList", () => {
  const parsed = ts.createSourceFile("ApprovedResultsScreen.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lists: ts.JsxSelfClosingElement[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(parsed) === "Animated.SectionList") lists.push(node);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.equal(lists.length, 1);
  const props = lists[0].attributes.properties.filter(ts.isJsxAttribute);
  assert.equal(props.find(prop => prop.name.getText(parsed) === "ref")?.initializer?.getText(parsed), "{flightResultsListRef}");
  assert.equal(props.find(prop => prop.name.getText(parsed) === "keyboardShouldPersistTaps")?.initializer?.getText(parsed), '"handled"');
  assert.match(props.find(prop => prop.name.getText(parsed) === "renderItem")?.getText(parsed) ?? "", /<PriceAlert product="flight"/);
});

test("Flight popup preserves its copy, themed surfaces and 44 by 44 close target", () => {
  assert.match(flight, />Track prices<\/Text>/);
  assert.match(flight, />Target price \(\{currency\}\)<\/Text>/);
  assert.match(flight, /label=\{pending \? "Creating…" : "Create alert"\}/);
  assert.match(flight, /<X accessible=\{false\} size=\{22\} color=\{theme\.icon\}/);
  assert.match(flight, /s0\.hotelAlertSheetClose, pressed && s0\.flightHeaderControlPressed/);
  assert.match(source, /hotelAlertSheetClose: \{ width: 44, height: 44, flexShrink: 0, alignItems: "center", justifyContent: "center" \}/);
  assert.match(source, /flightAlertTitle: \{ fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(source, /flightAlertSubtitle: \{ fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts\.medium \}/);
  assert.match(source, /alertSheet: \{ padding: 20, gap: 12, borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 \}/);
  assert.match(flight, /backgroundColor: theme\.surface, borderColor: theme\.border/);
  assert.match(flight, /s0\.flightAlertTitle, s0\.hotelAlertSheetTitle, \{ color: theme\.textPrimary \}/);
  assert.match(flight, /s0\.flightAlertSubtitle, \{ color: theme\.textSecondary \}/);
  assert.match(flight, /s0\.alertInput, \{ color: theme\.textPrimary, borderColor: theme\.border, backgroundColor: theme\.background \}/);
});
const source=readFileSync("src/features/search/ApprovedResultsScreen.tsx","utf8");const alert=source.slice(source.indexOf("function PriceAlert"));const destination=readFileSync("src/features/flow/HotelSearchPanel.tsx","utf8");
const flightSheetShell=readFileSync("src/features/search/FlightResultsSheetShell.tsx","utf8");
const flight = alert.slice(alert.indexOf("if (flight)"), alert.indexOf('if (product !== "hotel"'));
test("Flight Track Price is compact and uses semantic blue tokens",()=>{assert.match(alert,/backgroundColor: theme\.priceAlertSurface/);assert.match(alert,/borderColor: theme\.priceAlertBorder/);assert.match(alert,/color=\{theme\.priceAlertAccent\}/);assert.match(source,/compactPriceAlert: \{[^\n]*minHeight: 52[^\n]*borderRadius: 12/);});
test("Flight Track Price preserves the accessible native Switch and business logic",()=>{assert.match(alert,/<Switch[\s\S]*accessibilityRole="switch"[\s\S]*accessibilityLabel="Track this flight price"/);assert.match(alert,/travelApi\.createPriceAlert/);assert.match(alert,/travelApi\.updatePriceAlertStatus/);});
test("Flight and Hotel share compact semantic price-alert presentation",()=>{const flight=alert.slice(alert.indexOf("if (flight)"),alert.indexOf('if (product !== "hotel"'));const hotel=alert.slice(alert.indexOf('const toggleDisabled = pending || !hotelAlertKnown'));for(const productAlert of [flight,hotel]){assert.match(productAlert,/s0\.compactPriceAlert/);assert.match(productAlert,/backgroundColor: theme\.priceAlertSurface/);assert.match(productAlert,/borderColor: theme\.priceAlertBorder/);assert.match(productAlert,/<Bell[^>]*color=\{theme\.priceAlertAccent\}/);assert.match(productAlert,/color: theme\.textPrimary/);}});
test("Flight Results owns one stable non-sticky alert intro above its result summary",()=>{const list=source.slice(source.indexOf("<Animated.SectionList"),source.indexOf("ListEmptyComponent"));const header=list.slice(list.indexOf("renderSectionHeader"),list.indexOf("renderItem"));const items=list.slice(list.indexOf("renderItem"));assert.doesNotMatch(header,/<PriceAlert product="flight"/);assert.match(list,/sections=\{\[\{ data: !flightState \? \[null, \.\.\.\(sorted as FlightResult\[\]\)\] : \[\] \}\]\}/);assert.match(items,/item === null[\s\S]*<PriceAlert product="flight"[\s\S]*<FlightResultsSummaryRow/);assert.equal(list.match(/<PriceAlert product="flight"/g)?.length,1);assert.match(items,/logInitialMount=\{index === 1\}/);});
test("Flight keeps its Switch visible during reconciliation and reserves progress for mutations",()=>{const flight=alert.slice(alert.indexOf("if (flight)"),alert.indexOf('if (product !== "hotel"'));assert.match(flight,/const toggleDisabled = pending \|\| loadingAlert \|\| unavailable/);assert.match(flight,/\{pending \? <ActivityIndicator/);assert.doesNotMatch(flight,/pending \|\| loadingAlert\) \? <ActivityIndicator/);assert.match(flight,/<Switch[\s\S]*disabled=\{toggleDisabled\}/);assert.match(alert,/readSession\(\)[\s\S]*travelApi\.priceAlerts\(\)[\s\S]*matchingFlightPriceAlert/);});
test("Hotel reconciliation is silent while mutation feedback remains visible",()=>{const hotel=alert.slice(alert.indexOf('const toggleDisabled = pending || !hotelAlertKnown'));assert.match(hotel,/const toggleDisabled = pending \|\| !hotelAlertKnown \|\| unavailable/);assert.match(hotel,/\{pending \? <ActivityIndicator/);assert.doesNotMatch(hotel,/ActivityIndicator[^\n]*loadingAlert/);assert.match(hotel,/accessibilityState=\{\{ checked: isTracking, disabled: toggleDisabled, busy: pending \}\}/);assert.doesNotMatch(hotel,/busy: pending \|\| loadingAlert/);assert.match(hotel,/<Switch[\s\S]*disabled=\{toggleDisabled\}/);});
test("Hotel off-to-on always opens target entry while Flight retains its existing reactivation path",()=>{const toggle=alert.slice(alert.indexOf("const handleToggle"),alert.indexOf("const createAlert"));assert.match(toggle,/if \(!flight\) \{[\s\S]*setTargetDraft\(""\); setTargetError\(""\); setTargetOpen\(true\); return;/);assert.ok(toggle.indexOf("if (!flight)") < toggle.indexOf("if (!matchingAlert)"));const flightPath=toggle.slice(toggle.indexOf("if (!matchingAlert)"));assert.match(flightPath,/travelApi\.updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);});
test("Flight and Hotel close invalidate overlapping toggle work before it can reopen the target sheet",()=>{const close=alert.slice(alert.indexOf("const closeTargetSheet"),alert.indexOf("const matchingAlert ="));assert.match(alert,/const targetIntentRef = useRef\(new PriceAlertTargetIntent\(\)\)/);assert.match(close,/targetIntentRef\.current\.close\(\);[\s\S]*setTargetOpen\(false\)/);assert.match(close,/\}, \[\]\)/);const toggle=alert.slice(alert.indexOf("const handleToggle"),alert.indexOf("const createAlert"));assert.match(toggle,/const targetIntent = next \? targetIntentRef\.current\.beginOpen\(\) : 0/);assert.match(toggle,/if \(!targetIntentRef\.current\.isCurrent\(targetIntent\)\) return;[\s\S]*setTargetOpen\(true\)/);});
test("Hotel target submission searches every matching paused target before creating",()=>{const createStart=alert.indexOf("const createAlert");const create=alert.slice(createStart,alert.indexOf("if (flight)",createStart));assert.match(create,/samePausedHotelTarget = !flight[\s\S]*travelApi\.priceAlerts\(\)/);assert.match(create,/\.alerts\.find\(\(alert\) =>/);assert.match(create,/alert\.status === "PAUSED"/);assert.match(create,/Number\(alert\.targetPrice\) === parsed\.value/);assert.match(create,/alert\.currency\?\.toUpperCase\(\) === currency\.toUpperCase\(\)/);assert.match(create,/matchingHotelPriceAlert\(\[alert\], plan\)\?\.id === alert\.id/);assert.match(create,/samePausedHotelTarget[\s\S]*updatePriceAlertStatus\(samePausedHotelTarget\.id, "ACTIVE"\)[\s\S]*createPriceAlert/);});
test("Hotel reconciliation preserves saved-alert and create/update behavior",()=>{assert.match(alert,/useFocusEffect\([\s\S]*void reconcile\(\)/);assert.match(alert,/travelApi\.priceAlerts\(\)[\s\S]*matchingHotelPriceAlert/);assert.match(alert,/buildHotelPriceAlertPayload/);assert.match(alert,/travelApi\.createPriceAlert/);assert.match(alert,/travelApi\.updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);assert.match(alert,/travelApi\.updatePriceAlertStatus\(matchingAlert\.id, "PAUSED"\)/);});
test("Hotel navigation remains a direct hotel-details push without alert lifecycle hacks",()=>{const openHotelStart=source.indexOf("const openHotel = () => {");const openHotel=source.slice(openHotelStart,source.indexOf("const shareHotel",openHotelStart));assert.match(openHotel,/router\.push\(\{[\s\S]*pathname: "\/hotel-details"/);assert.doesNotMatch(openHotel,/reconcile|setLoadingAlert|setTimeout|AppState/);});
test("Hotel target sheet has an accessible right-side X instead of a bottom Cancel button",()=>{const hotel=alert.slice(alert.indexOf('if (product !== "hotel"'),alert.indexOf("export function BottomNav"));assert.match(hotel,/<View style=\{s0\.hotelAlertSheetHeader\}>[\s\S]*message\("hotelAlertTitle"\)[\s\S]*<Pressable accessibilityRole="button" accessibilityLabel="Close price alert"[\s\S]*<X accessible=\{false\}[^>]*color=\{theme\.icon\}/);assert.doesNotMatch(hotel,/<Button label=\{t\("cancel"\)\}/);assert.match(source,/hotelAlertSheetTitle: \{ flex: 1, minWidth: 0 \}/);assert.match(source,/hotelAlertSheetClose: \{ width: 44, height: 44/);});
test("Hotel Price Alert uses a first-tap touch container and immediate modal lifecycle",()=>{const hotel=alert.slice(alert.indexOf('if (product !== "hotel"'),alert.indexOf("export function BottomNav"));assert.match(hotel,/<Modal visible=\{targetOpen\} transparent animationType="none"/);assert.match(hotel,/<ScrollView[^>]*keyboardShouldPersistTaps="always"[^>]*keyboardDismissMode="none"[^>]*scrollEnabled=\{false\}/);assert.match(hotel,/<TextInput autoFocus/);assert.match(hotel,/<Pressable accessibilityRole="button" accessibilityLabel="Close price alert"[^>]*onPress=\{closeTargetSheet\}/);assert.match(hotel,/<Button label=\{pending \? message\("creating"\) : message\("createAlert"\)\} onPress=\{\(\) => void createAlert\(\)\}/);assert.doesNotMatch(hotel,/hotelTargetMotion|hotelTargetKeyboard|useSearchPickerMotion|useSearchPickerKeyboardPresentation|Animated\.View/);assert.match(source,/hotelAlertTouchContainer: \{ flex: 1 \}/);assert.match(source,/hotelAlertTouchContent: \{ flexGrow: 1, justifyContent: "flex-end" \}/);});
test("Flight target sheet mounts only while open and gives the close control direct touch ownership",()=>{const flight=alert.slice(alert.indexOf("if (flight)"),alert.indexOf('if (product !== "hotel"'));assert.match(flight,/\{targetOpen \? <Modal visible transparent animationType="none"/);assert.doesNotMatch(flight,/<Modal visible=\{targetOpen\}/);assert.doesNotMatch(flight,/<ScrollView/);assert.match(flight,/<Pressable accessibilityRole="button" accessibilityLabel="Close price alert"[^>]*disabled=\{pending\}[^>]*onPressIn=\{closeTargetSheet\}[^>]*onPress=\{closeTargetSheet\}/);assert.match(flight,/<TextInput autoFocus/);assert.doesNotMatch(flight,/Keyboard\.dismiss|\.blur\(|setTimeout|requestAnimationFrame|InteractionManager|keyboard(?:Did|Will)Hide/);});

test("Flight target popup reuses the quick-sheet horizontal inset and floating shape without moving the toggle",()=>{const flight=alert.slice(alert.indexOf("if (flight)"),alert.indexOf('if (product !== "hotel"'));assert.match(flightSheetShell,/export const FLIGHT_QUICK_SHEET_HORIZONTAL_INSET = 12/);assert.match(source,/import \{ FLIGHT_QUICK_SHEET_HORIZONTAL_INSET \} from "\.\/FlightResultsSheetShell"/);assert.match(flight,/<View style=\{\[s0\.alertSheet, s0\.flightAlertSheet,/);assert.match(source,/flightAlertSheet: \{ marginHorizontal: FLIGHT_QUICK_SHEET_HORIZONTAL_INSET, borderWidth: 1, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 \}/);assert.equal(flight.match(/accessibilityLabel="Track this flight price"/g)?.length,1);assert.doesNotMatch(flight,/FlightResultsSheetShell|insetFlightQuickSheet/);});

test("Flight target popup close remains synchronous and idempotent",()=>{const close=alert.slice(alert.indexOf("const closeTargetSheet"),alert.indexOf("const matchingAlert ="));assert.match(close,/const closeTargetSheet = useCallback\(\(\) => \{\s*targetIntentRef\.current\.close\(\);\s*setTargetOpen\(false\);\s*\}, \[\]\)/);assert.doesNotMatch(close,/async|await|Keyboard\.dismiss|\.blur\(|setTimeout|requestAnimationFrame|InteractionManager|keyboard(?:Did|Will)Hide/);});




test("Hotel target creation closes on success and preserves recoverable failures",()=>{const start=alert.indexOf("const createAlert");const create=alert.slice(start,alert.indexOf("if (flight)",start));assert.match(create,/setCurrentMatchingAlert\(saved\.alert\); closeTargetSheet\(\); setTargetDraft\(""\)/);assert.match(create,/status === 409\) \{ await reconcile\(\); setTargetError\("An alert for this search already exists\."\); \}/);assert.match(create,/else setTargetError\(error instanceof TravelApiError/);});
