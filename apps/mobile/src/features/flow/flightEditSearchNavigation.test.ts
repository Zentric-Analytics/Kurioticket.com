import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("approved flight Edit search opens a local modal with current canonical params", () => {
  const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  const editStart = source.indexOf("  const edit = () => {");
  const editEnd = source.indexOf("  const normalizeFlightPrice", editStart);
  const editHandler = source.slice(editStart, editEnd);

  assert.ok(editStart >= 0 && editEnd > editStart, "expected the ApprovedResultsScreen edit handler");
  assert.match(source, /const \[editSearchOpen, setEditSearchOpen\] = useState\(false\)/);
  assert.match(source, /const pendingFlightEditTargetKey = useRef<string \| null>\(null\)/);
  assert.match(editHandler, /if \(product === "flight"\)[\s\S]*?pendingFlightEditTargetKey\.current = null;[\s\S]*?setEditSearchOpen\(true\)[\s\S]*?return;/);
  assert.match(source, /<FlightEditSearchModal[\s\S]*?visible=\{editSearchOpen\}[\s\S]*?params=\{flightEditSearchParams\(params\)\}[\s\S]*?onClose=\{closeFlightEditSearch\}[\s\S]*?onSubmit=\{submitFlightEditSearch\}/);
  assert.doesNotMatch(source, /onAfterClose|completeFlightEditSearch|pendingFlightEditSearchParams/);
  assert.doesNotMatch(editHandler, /\/edit-flight-search|activeSearch/);
  assert.doesNotMatch(editHandler.slice(0, editHandler.indexOf('router.push({\n      pathname: "/hotels"')), /router\.(?:push|replace|back)/);
  assert.doesNotMatch(editHandler, /pathname: "\/flights"/);
});

test("results edit modal owns presentation without a post-dismiss business callback", () => {
  const modal = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");
  assert.match(modal, /<Modal transparent animationType="none" visible onRequestClose=\{onClose\}/);
  assert.match(modal, /accessibilityViewIsModal/);
  assert.match(modal, /accessibilityLabel="Close edit search"/);
  assert.match(modal, /keyboardShouldPersistTaps="handled"/);
  assert.match(modal, /onClose: \(\) => void/);
  assert.match(modal, /onSubmit: \(params: Record<string, string \| undefined>\) => void/);
  assert.match(modal, /<FlightSearchPanel embedded params=\{presentedParams\} onValidatedSubmit=\{onSubmit\} editAppearance resultsModalAppearance \/>/);
  assert.doesNotMatch(modal, /submitNavigation="replace"|onBeforeNavigate=\{onClose\}/);
  assert.doesNotMatch(modal, /router|flightSearchParams|travelApi|onAfterClose|wasRendered|useEffect|useRef/);
  assert.doesNotMatch(modal, /setTimeout|SEARCH_PICKER_CLOSE_DURATION_MS/);
  assert.doesNotMatch(modal, /accessibilityLabel="Go back"|ArrowLeft/);
  assert.doesNotMatch(modal, /paddingBottom: motion\.bottomSafeAreaInset/);
  assert.match(modal, /const floatingBottomGap = FLIGHT_FLOATING_SHEET_BOTTOM_GAP/);
  assert.match(modal, /marginBottom: floatingBottomGap/);
  assert.match(modal, /const internalBottomPadding = Math\.max\(20, bottomSafeAreaInset - floatingBottomGap\)/);
  assert.match(modal, /contentContainerStyle=\{\[styles\.content, \{ paddingBottom: internalBottomPadding \}\]\}/);
  assert.doesNotMatch(modal, /headerAnchor|flightResultsHeaderHeight/);
  assert.match(modal, /<SafeAreaView[^>]*style=\{styles.backdrop\}>[\s\S]*StyleSheet.absoluteFill, styles.scrim/);
  assert.match(modal, /sheet: \{ maxHeight: "88%", marginHorizontal: FLIGHT_QUICK_SHEET_HORIZONTAL_INSET, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24/);
  assert.match(modal, /content: \{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 \}/);
});

test("only the results modal opts into theme-aware structured flight cards", () => {
  const modal = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const dedicatedEdit = readFileSync("src/features/flow/EditFlightSearchScreen.tsx", "utf8");
  const homepage = readFileSync("src/features/flow/HomeFlowScreen.tsx", "utf8");

  assert.equal(modal.match(/resultsModalAppearance/g)?.length, 1);
  assert.doesNotMatch(dedicatedEdit, /resultsModalAppearance/);
  assert.doesNotMatch(homepage, /resultsModalAppearance/);
  assert.match(modal, /const resultsCanvas = ft\.theme\.dark \? ft\.colors\.page : FLIGHT_RESULTS_LIGHT_CANVAS/);
  assert.match(panel, /backgroundColor: resultsModalAppearance \? "transparent" : ft\.colors\.surface/);
  assert.match(panel, /resultsModalCard:\{borderWidth:1,borderRadius:13,overflow:"hidden",marginTop:10\}/);
  assert.match(panel, /backgroundColor: ft\.colors\.card, borderColor: ft\.colors\.border/);
});

test("results edit modal uses the Flight Results canvas and locally refines its header", () => {
  const modal = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");
  const flowStyles = readFileSync("src/features/flow/flowStyles.ts", "utf8");
  assert.match(modal, /style=\{styles\.header\}/);
  assert.doesNotMatch(modal, /borderBottomColor: ft\.colors\.border|header: \{[^}]*borderBottomWidth/);
  assert.match(modal, /FLIGHT_RESULTS_LIGHT_CANVAS/);
  assert.match(modal, /sheet, \{ backgroundColor: resultsCanvas/);
  assert.match(modal, /style=\{\{ backgroundColor: resultsCanvas \}\}/);
  assert.match(modal, /title: \{[^}]*fontWeight: "600"/);
  assert.match(flowStyles, /title: \{[^}]*fontWeight: "800"/);
  assert.ok(modal.indexOf("Change your search") < modal.indexOf('accessibilityLabel="Close edit search"', modal.indexOf("Change your search")));
});

test("results modal cards preserve the flight form hierarchy and controls", () => {
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const segments = panel.indexOf('<Segments<FlightForm["tripType"]>');
  const route = panel.indexOf('testID={resultsModalAppearance ? "results-modal-route-card"');
  const dates = panel.indexOf('testID={resultsModalAppearance ? "results-modal-dates-card"');
  const travelers = panel.indexOf('testID={resultsModalAppearance ? "results-modal-travelers-card"');
  const button = panel.indexOf('<PrimaryButton label={submitLabel}', travelers);

  assert.ok(segments >= 0 && segments < route && route < dates && dates < travelers && travelers < button);
  const routeCard = panel.slice(route, dates);
  assert.match(routeCard, /label="Origin"[\s\S]*label="Destination"[\s\S]*accessibilityLabel="Swap origin and destination"/);
  assert.match(routeCard, /modalCardDivider=\{resultsModalAppearance\}/);
  assert.match(panel.slice(dates, travelers), /label="Travel dates"/);
  assert.match(panel.slice(travelers, button), /label="Travelers & Cabin Class"/);
  assert.match(panel, /\{notice \? <UnavailableNotice text=\{notice\}\/> : null\}\{showSubmit \? <View style=\{styles\.button\}><PrimaryButton label=\{submitLabel\}/);
});

test("results modal appearance is isolated from shared compact field geometry", () => {
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const primitives = readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8");
  const compactStyles = primitives.slice(primitives.indexOf("compactField:"), primitives.indexOf("overlay:"));

  assert.match(panel, /function MultiCityEditor\([^\n]*resultsModalAppearance/);
  assert.match(compactStyles, /compactField: \{ minHeight: 66, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1/);
  assert.match(compactStyles, /compactLabel: \{ fontSize: 10, fontWeight: "800", letterSpacing: 0\.5 \}/);
  assert.match(compactStyles, /compactValueRow: \{ flexDirection: "row", alignItems: "center", gap: 9 \}/);
  assert.match(compactStyles, /compactValue: \{ fontSize: 15, fontWeight: "600", flexShrink: 1 \}/);
});

test("Flight Edit Search shares the Flight quick-sheet outer inset without changing content padding", () => {
  const modal = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");
  assert.match(modal, /import \{ FLIGHT_FLOATING_SHEET_BOTTOM_GAP, FLIGHT_QUICK_SHEET_HORIZONTAL_INSET, FLIGHT_RESULTS_LIGHT_CANVAS \} from "\.\/FlightResultsSheetShell"/);
  assert.match(modal, /sheet: \{ maxHeight: "88%", marginHorizontal: FLIGHT_QUICK_SHEET_HORIZONTAL_INSET/);
  assert.match(modal, /content: \{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 \}/);
  assert.doesNotMatch(modal, /content: \{[^}]*FLIGHT_QUICK_SHEET_HORIZONTAL_INSET/);
});

test("Flight Edit Search travel explicitly includes its external floating gap", () => {
  const modal = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");
  const motion = readFileSync("src/features/flow/searchPickerPresentation.ts", "utf8");
  assert.match(modal, /useSearchPickerMotion\(visible, \{ additionalTravelDistance: floatingBottomGap \}\)/);
  assert.match(motion, /additionalTravelDistance\?: number/);
  assert.match(motion, /additionalTravelDistance = 0/);
  assert.match(motion, /\) \+ additionalTravelDistance/);
  assert.match(motion, /\[additionalTravelDistance\]/);
});

test("changed flight edits update route params while open and close after observing the target key", () => {
  const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  const submitStart = source.indexOf("  const submitFlightEditSearch = useCallback");
  const closeStart = source.indexOf("  const closeFlightEditSearch = useCallback", submitStart);
  const effectStart = source.indexOf("  useEffect(() => {", closeStart);
  const editStart = source.indexOf("  const edit = () => {", effectStart);
  const submitHandler = source.slice(submitStart, closeStart);
  const observedKeyEffect = source.slice(effectStart, editStart);

  assert.ok(submitStart >= 0 && closeStart > submitStart && effectStart > closeStart && editStart > effectStart);
  assert.match(submitHandler, /const nextPlan = buildSearchPlan\("flight", nextParams\);\s*if \(!nextPlan\.plan\) return;/);
  assert.match(submitHandler, /if \(nextPlan\.plan\.key === plan\.plan\?\.key\) \{\s*pendingFlightEditTargetKey\.current = null;\s*setEditSearchOpen\(false\);\s*return;\s*\}/);
  assert.match(submitHandler, /pendingFlightEditTargetKey\.current = nextPlan\.plan\.key;\s*router\.setParams\(flightSearchRouteParamPatch\(nextParams\)\);/);
  assert.equal(submitHandler.match(/setEditSearchOpen\(false\)/g)?.length, 1, "only the same-key branch closes from submit");
  assert.ok(submitHandler.indexOf("setEditSearchOpen(false)") < submitHandler.indexOf("pendingFlightEditTargetKey.current = nextPlan.plan.key"));
  assert.match(observedKeyEffect, /const targetKey = pendingFlightEditTargetKey\.current;\s*if \(!editSearchOpen \|\| !targetKey \|\| plan\.plan\?\.key !== targetKey\) return;\s*pendingFlightEditTargetKey\.current = null;\s*setEditSearchOpen\(false\);/);
  assert.match(observedKeyEffect, /\}, \[editSearchOpen, plan\.plan\?\.key\]\);/);
  assert.doesNotMatch(submitHandler + observedKeyEffect, /router\.(?:replace|push)|requestAnimationFrame|cancelAnimationFrame|setTimeout/);
  assert.doesNotMatch(source, /flightEditNavigationFrame|completeFlightEditSearch|onAfterClose|pendingFlightEditSearchParams/);
});

test("FlightSearchPanel preserves validation and default navigation around its validated override", () => {
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const submitStart = panel.indexOf("  const submit = () => {");
  const submitEnd = panel.indexOf("  const chooseAirport", submitStart);
  const submit = panel.slice(submitStart, submitEnd);

  assert.ok(submitStart >= 0 && submitEnd > submitStart);
  assert.match(submit, /if \(submitting\) return;.*validateFlightForm\(form\).*if \(Object\.keys\(next\)\.length\)/s);
  assert.equal(submit.match(/flightSearchParams\(form\)/g)?.length, 1);
  assert.match(submit, /const searchParams = flightSearchParams\(form\); setSubmitting\(true\); if \(onValidatedSubmit\) \{ onValidatedSubmit\(searchParams\); return; \} onBeforeNavigate\?\.\(\); router\[submitNavigation\]\(\{ pathname: "\/flight-results", params: searchParams \}\)/);
});

test("dedicated edit screen hydrates the shared form, cancels, and replaces stale edit history on submit", () => {
  const screen = readFileSync("src/features/flow/EditFlightSearchScreen.tsx", "utf8");
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  assert.match(screen, /useLocalSearchParams<Record<string, string \| string\[\]>>\(\)/);
  assert.match(screen, /<FlightSearchPanel params=\{params\} submitNavigation="replace" editAppearance \/>/);
  assert.match(screen, /onPress=\{\(\) => router\.back\(\)\}/);
  assert.doesNotMatch(screen, /FlightsScreen|ResponsiveHero|Routes/);
  assert.match(panel, /router\[submitNavigation\]\(\{ pathname: "\/flight-results", params: searchParams \}\)/);
  assert.match(panel, /onBeforeNavigate\?\.\(\); router\[submitNavigation\]/);
});


test("edit flight search uses the unified responsive editor hierarchy", () => {
  const screen = readFileSync("src/features/flow/EditFlightSearchScreen.tsx", "utf8");
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  assert.match(screen, /Update your trip details/);
  assert.match(screen, /content: \{ flexGrow: 1/);
  assert.match(panel, /appearance=\{editAppearance && !resultsModalAppearance \? "filled" : "default"\}/);
  assert.match(panel, /label: FLIGHT_TRIP_TYPE_LABELS\["one-way"\]/);
  assert.match(panel, /label: FLIGHT_TRIP_TYPE_LABELS\["multi-city"\] }/);
  assert.match(panel, /accessibilityLabel="Swap origin and destination"/);
  assert.match(panel, /editCard:\{borderWidth:0,borderRadius:22/);
  assert.match(panel, /embedded \? styles\.embeddedEdit : styles\.editCard/);
  assert.match(panel, /embeddedEdit:\{borderWidth:0,padding:8\}/);
  assert.match(panel, /!embedded && ft\.styles\.card, !embedded && ft\.styles\.shadow/);
  assert.match(panel, /form\.departureDate && form\.returnDate \? `\$\{displayDate\(form\.departureDate\)\} — \$\{displayDate\(form\.returnDate\)\}` : "Travel dates"/);
  assert.match(panel, /formatTravelerCabinSummary\(form\)/);
});
