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
  assert.match(modal, /<FlightSearchPanel embedded params=\{presentedParams\} onValidatedSubmit=\{onSubmit\} editAppearance \/>/);
  assert.doesNotMatch(modal, /submitNavigation="replace"|onBeforeNavigate=\{onClose\}/);
  assert.doesNotMatch(modal, /router|flightSearchParams|travelApi|onAfterClose|wasRendered|useEffect|useRef/);
  assert.doesNotMatch(modal, /setTimeout|SEARCH_PICKER_CLOSE_DURATION_MS/);
  assert.doesNotMatch(modal, /accessibilityLabel="Go back"|ArrowLeft/);
  assert.match(modal, /paddingBottom: motion\.bottomSafeAreaInset/);
  assert.doesNotMatch(modal, /safeAreaClearance|topInset/);
  assert.doesNotMatch(modal, /headerAnchor|flightResultsHeaderHeight/);
  assert.match(modal, /<SafeAreaView[^>]*style=\{styles.backdrop\}>[\s\S]*StyleSheet.absoluteFill, styles.scrim/);
  assert.match(modal, /sheet: \{ maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24/);
  assert.match(modal, /content: \{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 \}/);
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
  assert.match(panel, /appearance=\{editAppearance \? "filled" : "default"\}/);
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
