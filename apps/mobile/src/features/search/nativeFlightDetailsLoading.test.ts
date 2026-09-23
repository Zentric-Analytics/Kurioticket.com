import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const details = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");
const loadingStart = details.indexOf("function FlightDetailsLoadingSkeleton");
const loadingEnd = details.indexOf("function HeroCurve", loadingStart);
const loading = details.slice(loadingStart, loadingEnd);

type Element = { type: string; props: Record<string, any>; children: Element[] };
// Execute the actual skeleton JSX/styles without booting RN's native runtime.
// Host elements and inert hooks are the boundary; no flight data/actions are supplied.
function renderLoading(dark = false, topInset = 47, bottomInset = 34, fareCardWidth = 216, platform: "android" | "ios" = "android") {
  let backs = 0;
  const host = (type: string | ((props: any) => Element), props: Record<string, any> | null, ...children: any[]): Element =>
    typeof type === "function" ? type(props) : { type, props: props ?? {}, children: children.flat(Infinity).filter((child) => child && typeof child === "object") };
  const palette = details.slice(details.indexOf("const FLIGHT_DETAILS_LIGHT_CANVAS"), details.indexOf("type Params"));
  const styles = details.slice(details.indexOf("const s=StyleSheet.create"));
  const headerStart = details.indexOf("function FlightDetailsBrandHeader");
  const headerEnd = details.indexOf("function FareStatusIcon", headerStart);
  const brandHeader = details.slice(headerStart, headerEnd);
  const code = ts.transpileModule(`${palette}\n${loading}\n${brandHeader}\n${styles}\nFlightDetailsLoadingSkeleton(input);`, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const theme = { dark, background: "#101114", surface: dark ? "#202126" : "#FFFFFF", border: dark ? "#454650" : "#CBD5E1" };
  const root = runInNewContext(code, {
    React: { createElement: host }, View: "View", ScrollView: "ScrollView", SafeAreaView: "SafeAreaView",
    Pressable: "Pressable", Text: "Text", Image: "Image", ArrowLeft: "ArrowLeft", Heart: "Heart", FlowIcon: "FlowIcon", StatusBar: "StatusBar", Svg: "Svg", Path: "Path", Defs: "Defs", LinearGradient: "LinearGradient", Stop: "Stop", Rect: "Rect",
    Animated: { View: "Animated.View", Value: class { constructor(public value: number) {} } },
    useState: (value: unknown) => [value, () => {}], useRef: (current: unknown) => ({ current }), useEffect: () => {}, useCallback: (callback: unknown) => callback,
    Platform: { OS: platform }, StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1, absoluteFillObject: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 } }, ui: { blue: "#2563EB", green: "#16A34A" }, appFonts: { semibold: "Inter_600SemiBold", bold: "Inter_700Bold" },
    router: { back: () => { backs += 1; } }, androidFavoriteColors: { strokeWidth: 2, savedStroke: "#075EE8", unsavedStroke: "#0F172A", savedFill: "#075EE8", unsavedFill: "transparent", shareStroke: "#0F172A" }, FLIGHT_RESULTS_LIGHT_CANVAS: "#F5F7FB",
    input: { theme, topInset, bottomInset, fareCardWidth, viewportWidth: 390 },
  }) as Element;
  return { root, theme, backCount: () => backs };
}
const descendants = (node: Element): Element[] => [node, ...node.children.flatMap(descendants)];
const find = (node: Element, id: string) => {
  const result = descendants(node).find(({ props }) => props.testID === id);
  assert.ok(result, `missing ${id}`);
  return result;
};
const style = (node: Element) => Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));

test("entry loading renders an accessible, theme-aware Flight Details skeleton", () => {
  assert.match(details, /state === "loading"\) return <FlightDetailsLoadingSkeleton/);
  assert.match(loading, /testID="flight-details-loading-skeleton"/);
  assert.match(loading, /accessibilityRole="progressbar" accessibilityState=\{\{busy:true\}\} accessibilityLabel="Loading flight details"/);
  assert.match(loading, /theme\.background/);
  assert.match(loading, /theme\.surface/);
  assert.match(loading, /theme\.border/);
  assert.doesNotMatch(details, /Checking current flight details/);
});

test("entry skeleton anticipates route, itinerary, fare carousel, and information deck", () => {
  for (const style of ["heroCopy", "loadingItineraryCard", "loadingFareHeading", "loadingFareCard", "loadingInfoDeck"]) assert.match(loading, new RegExp(`s\\.${style}`));
  assert.match(loading, /width:fareCardWidth/);
  assert.match(details, /loadingFareCard:\{height:142,position:"relative",borderWidth:1\.5,borderRadius:15,paddingHorizontal:12,paddingTop:6,paddingBottom:8,gap:4\}/);
  assert.equal((details.match(/s\.loadingFareCard/g) ?? []).length, 2, "both loading rails use the shared loading card style");
  assert.match(details, /loadingFareIdentity:\{alignSelf:"stretch",alignItems:"center"/);
  assert.match(details, /loadingFareNameRow:\{maxWidth:"100%",flexDirection:"row",alignItems:"flex-start",gap:6\}/);
  assert.match(details, /loadingFareIcon:\{width:24,height:24[^}]*flexShrink:0/);
  assert.match(details, /loadingFareName:\{width:72,height:12,marginTop:6/);
  assert.match(details, /loadingBenefitDot:\{width:16,height:16/);
  assert.match(loading, /s\.loadingFareContent[\s\S]*?s\.loadingFareIdentity[\s\S]*?s\.loadingBenefitRow[\s\S]*?s\.loadingFarePriceBlock/);
  assert.match(details, /loadingFareContent:\{alignSelf:"stretch",gap:5,paddingBottom:31\}/);
  assert.match(details, /loadingFarePriceBlock:\{position:"absolute",bottom:6,left:12,right:12,alignItems:"center"\}/);
  assert.doesNotMatch(details, /loadingFarePriceBlock:\{[^}]*marginTop:"auto"/);
  assert.match(loading, /120\s*\+\s*bottomInset/);
});

test("skeleton pulse honors reduced motion and leaves Back to results interactive", () => {
  assert.match(details, /AccessibilityInfo/);
  assert.match(loading, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(loading, /reduceMotionChanged/);
  assert.match(loading, /if\(reduceMotion\)\{opacity\.setValue\(\.7\);return;\}/);
  assert.match(loading, /Animated\.loop\(Animated\.sequence/);
  assert.equal(loading.match(/useNativeDriver:true/g)?.length, 2);
  const { root, backCount } = renderLoading();
  const back = descendants(root).find(({ props }) => props.accessibilityLabel === "Back to results");
  assert.ok(back);
  assert.equal(back.props.accessibilityRole, "button");
  back.props.onPress();
  assert.equal(backCount(), 1);
  assert.doesNotMatch(loading, /router\.(?:push|replace)/);
  assert.doesNotMatch(loading, /flight-details-hero|flight-details-hero\.webp|ImageBackground/);
});

test("loading presentation remains isolated from success and existing failure states", () => {
  assert.match(details, /state !== "available" \|\| !details \|\| !selected/);
  assert.match(details, /This flight is no longer available/);
  assert.match(details, /We couldn’t load this flight/);
  assert.match(details, /label="Retry" onPress=\{reload\}/);
  assert.match(details, /testID="flight-details-scroll-content"/);
  assert.match(details, /testID="fare-information-deck"/);
});

test("information skeleton mirrors flat tab content and the loaded navigation baseline",()=>{assert.match(loading,/s\.loadingTabs,\{borderBottomColor:surfaceBorderColor\}/);assert.match(details,/loadingTabs:\{height:48,borderBottomWidth:1,/);assert.doesNotMatch(details,/loadingInfoBody:\{[^}]*(?:borderWidth|borderRadius|backgroundColor)/);});

test("loading uses the branded white Flight Details header with disabled actions", () => {
  const { root } = renderLoading(true, 47);
  const header = find(root, "flight-details-brand-header");
  assert.equal(style(header).backgroundColor, "#FFFFFF");
  assert.equal(style(header).paddingTop, 47);
  const back = descendants(header).find(({ props }) => props.accessibilityLabel === "Back to results");
  const logo = descendants(header).find(({ props }) => props.accessibilityLabel === "Kurioticket");
  const save = descendants(header).find(({ props }) => props.accessibilityLabel === "Save flight");
  const share = descendants(header).find(({ props }) => props.accessibilityLabel === "Share flight");
  assert.ok(back);
  assert.ok(logo);
  assert.equal(save?.props.disabled, true);
  assert.equal(share?.props.disabled, true);
  assert.match(details, /kurioticket-logo-primary-light-bg\.png/);
  assert.doesNotMatch(details, /DetailGlassSurface|heroIconGlass|heroActionsGlass/);
});

test("entry loading keeps the branded header above a fixed-height hero with two identity lines", () => {
  for (const top of [0, 24, 47, 59]) {
    const { root } = renderLoading(false, top);
    assert.equal(root.props.edges.length, 0);
    const header = find(root, "flight-details-brand-header");
    assert.equal(style(header).paddingTop, top);
    const hero = find(root, "flight-details-loading-hero");
    assert.equal(style(hero).minHeight, 318);
    assert.equal(style(hero).paddingTop, undefined);
    assert.equal(style(hero).paddingBottom, 122);
    assert.equal(style(hero).paddingHorizontal, 18);
    const copy = find(hero, "flight-details-loading-copy");
    assert.deepEqual(copy.children.map(({ props }) => props.testID), [
      "flight-details-loading-route", "flight-details-loading-metadata",
    ]);
    assert.deepEqual(copy.children.map((line) => style(line).height), [32, 16]);
    assert.equal(style(copy).gap, 3);
    const back = descendants(header).find(({ props }) => props.accessibilityLabel === "Back to results");
    assert.ok(back);
    assert.equal(style(back!).width, 44);
    assert.equal(style(back!).height, 44);
  }
});

test("entry itinerary overlaps the hero with loaded card breadth and representative content", () => {
  const { root, theme } = renderLoading();
  const body = find(root, "flight-details-loading-body");
  assert.equal(style(body).paddingHorizontal, 18);
  assert.equal(style(body).gap, 14);
  const overlap = find(body, "flight-details-loading-itinerary-overlap");
  assert.equal(body.children[0], overlap);
  assert.equal(style(overlap).marginTop, -104);
  assert.equal(style(overlap).zIndex, 1);
  assert.equal(style(overlap).marginHorizontal, -10);
  const card = find(overlap, "flight-details-loading-itinerary");
  assert.equal(style(card).borderRadius, 15);
  assert.equal(style(card).padding, 15);
  assert.equal(style(card).borderWidth, 1);
  assert.equal(style(card).backgroundColor, "#FFFFFF");
  assert.equal(style(card).borderColor, "#E1E7EF");
  const gloss = find(card, "flight-details-loading-itinerary-gloss");
  assert.equal(card.children[0], gloss, "the inert finish must paint behind loading content");
  assert.equal(gloss.props.pointerEvents, "none");
  assert.equal(gloss.props.accessible, false);
  assert.equal(style(gloss).borderRadius, style(card).borderRadius);
  assert.equal(style(gloss).overflow, "hidden");
  assert.equal(style(card).marginHorizontal, undefined, "do not double the loaded horizontal overlap");
  for (const part of ["direction-date", "journey", "airports", "airline"]) find(card, `flight-details-loading-${part}`);
});

test("dark loading itinerary keeps its semantic surface without the light gloss layer", () => {
  const { root, theme } = renderLoading(true);
  const card = find(root, "flight-details-loading-itinerary");
  assert.equal(style(card).backgroundColor, theme.surface);
  assert.equal(style(card).borderColor, "#344154");
  assert.equal(descendants(card).some(({ props }) => props.testID === "flight-details-loading-itinerary-gloss"), false);
});

test("entry loading mirrors the loaded hero curve beneath the branded header",()=>{
  const {root}=renderLoading(false,47);
  const header=find(root,"flight-details-brand-header");
  const scroll=find(root,"flight-details-loading-scroll");
  const hero=find(scroll,"flight-details-loading-hero");
  const curve=find(hero,"flight-details-loading-hero-curve");
  assert.ok(!descendants(scroll).includes(header));
  assert.equal(curve.type,"Svg");
  assert.equal(curve.props.viewBox,"0 0 100 64");
  assert.equal(curve.props.preserveAspectRatio,"none");
  assert.equal(style(curve).height,65);
  assert.equal(curve.children[0].props.d,"M0 12 Q50 64 100 12 L100 64 L0 64 Z");
});

test("platforms share the same branded header geometry",()=>{
  const android=renderLoading(false,47,34,216,"android").root;
  const ios=renderLoading(false,47,34,216,"ios").root;
  for (const root of [android,ios]) {
    const header=find(root,"flight-details-brand-header");
    assert.equal(style(header).backgroundColor,"#FFFFFF");
    assert.equal(style(header).paddingTop,47);
    const back=descendants(header).find(({props})=>props.accessibilityLabel==="Back to results");
    assert.ok(back);
    assert.deepEqual([style(back!).width,style(back!).height],[44,44]);
  }
});

test("entry fare and information rails reserve real widths, bottom price zones and four tabs", () => {
  for (const width of [197, 216, 217]) {
    const { root } = renderLoading(false, 47, 34, width);
    find(root, "flight-details-loading-fare-heading");
    const rail = find(root, "flight-details-loading-fares");
    assert.equal(rail.props.horizontal, true);
    assert.equal(rail.children.length, 2);
    rail.children.forEach((card) => {
      assert.equal(style(card).width, width);
      assert.equal(style(card).height, 142);
      assert.equal(style(card).borderRadius, 15);
      assert.equal(style(card.children.at(-1)!).position, "absolute");
      assert.equal(style(card.children.at(-1)!).bottom, 6);
    });
    const info = find(root, "flight-details-loading-info");
    const tabs = find(info, "flight-details-loading-tabs");
    assert.equal(tabs.children.length, 4);
    assert.equal(style(tabs).height, 48);
    assert.equal(style(tabs).gap, 22);
    find(info, "flight-details-loading-info-content");
  }
});

test("loading uses the final canvas and reserves an inert safe-area checkout dock", () => {
  for (const dark of [false, true]) for (const bottom of [0, 34]) {
    const { root, theme } = renderLoading(dark, 47, bottom);
    assert.equal(style(root).backgroundColor, dark ? theme.background : "#F3F6FA");
    const scroll = find(root, "flight-details-loading-scroll");
    assert.equal(scroll.props.contentInsetAdjustmentBehavior, "never");
    assert.equal(scroll.props.bounces, false);
    assert.equal(scroll.props.alwaysBounceVertical, false);
    assert.equal(scroll.props.overScrollMode, "never");
    assert.equal(scroll.props.contentContainerStyle.at(-1).paddingBottom, 120 + bottom);
    assert.equal(scroll.props.contentContainerStyle.at(-1).width, 390);
    assert.equal(scroll.props.contentContainerStyle.at(-1).maxWidth, 390);
    const dock = find(root, "flight-details-loading-checkout");
    assert.equal(style(dock).position, "absolute");
    assert.equal(style(dock).bottom, 0);
    assert.equal(style(dock).minHeight, 88);
    assert.equal(style(dock).elevation, 7);
    assert.equal(style(dock).shadowOffset.height, -4);
    assert.equal(style(dock).shadowOpacity, dark ? 0.28 : 0.1);
    assert.equal(style(dock).paddingBottom, Math.max(bottom, 10));
    assert.equal(style(dock).backgroundColor, theme.surface);
    assert.equal(dock.props.pointerEvents, "none");
    assert.equal(dock.props.accessibilityElementsHidden, true);
  }
});

test("only Back can act during entry loading and placeholders stay out of accessibility navigation", () => {
  const { root } = renderLoading();
  const nodes = descendants(root);
  const progress = nodes.filter(({ props }) => props.accessibilityRole === "progressbar");
  assert.equal(progress.length, 1);
  assert.equal(progress[0].props.accessibilityState.busy, true);
  assert.equal(progress[0].props.accessibilityLabel, "Loading flight details");
  assert.equal(style(progress[0]).position, "absolute", "busy announcement needs a non-zero accessibility frame without adding layout space");
  assert.equal(style(progress[0]).top, 0);
  assert.equal(style(progress[0]).bottom, 0);
  assert.equal(progress[0].props.pointerEvents, "none");
  const interactive = nodes.filter(({ props }) => Object.keys(props).some((key) => /^on(?:Press|Touch)/.test(key)));
  assert.deepEqual(interactive.map(({ props }) => props.accessibilityLabel), ["Back to results"]);
  assert.equal(nodes.filter(({ props }) => ["radio", "tab", "link"].includes(props.accessibilityRole)).length, 0);
  for (const id of ["copy", "body", "actions", "checkout"]) {
    const node = find(root, `flight-details-loading-${id}`);
    assert.equal(node.props.accessibilityElementsHidden, true);
    assert.equal(node.props.importantForAccessibility, "no-hide-descendants");
  }
});
