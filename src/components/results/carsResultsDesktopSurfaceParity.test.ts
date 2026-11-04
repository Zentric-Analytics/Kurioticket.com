import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, posix, relative } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createElement, type ComponentType } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { cn } from "../../lib/utils";

const results = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const card = readFileSync(
  new URL("./CarResultCard.tsx", import.meta.url),
  "utf8",
);
const alert = readFileSync(
  new URL("./CarPriceAlertControl.tsx", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL("../../app/cars/results/page.tsx", import.meta.url),
  "utf8",
);
const skeleton = readFileSync(
  new URL("../ui/Skeleton.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);
const hotelDesktopStyles = readFileSync(
  new URL("./hotelDetails/HotelDetailsDesktop.module.css", import.meta.url),
  "utf8",
);
const hotelResults = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const loading = readFileSync(
  new URL("../layout/SearchResultsLoadingTransition.tsx", import.meta.url),
  "utf8",
);

test("standalone Cars desktop matches Hotels results white body and preserves the Hotels details content column", () => {
  // Preserve the actual Hotels details column, but use the separate Hotels results page body color.
  const hotelCard = hotelDesktopStyles.match(/\.contentCard\s*\{([^}]+)\}/)?.[1];
  assert.ok(hotelCard);
  assert.match(hotelCard, /border: 1px solid #E1E6EA;/);
  assert.match(hotelCard, /border-radius: 16px;/);
  assert.match(hotelCard, /background: #fff;/);
  assert.match(hotelCard, /box-shadow: 0 2px 8px rgb\(25 32 36 \/ 4%\);/);
  assert.match(hotelDesktopStyles, /\.desktop\s*\{[^}]*background: #F7F9FC;/);
  assert.match(hotelResults, /flex-1 overflow-x-clip bg-\[#F5F7FB\] pb-2 sm:pb-8 sm:bg-\[#f6f8fb\] lg:bg-white/);

  assert.match(results, /<main className="flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white pb-8 lg:pb-12 lg:pt-6">/);
  assert.match(
    results,
    /data-cars-results-scroll-region\s+data-cars-results-hotel-column\s+className="page-shell max-sm:w-\[calc\(100%_-_28px\)\] pb-6 pt-0 sm:pt-6 lg:mt-0 lg:max-w-\[928px\] lg:rounded-2xl lg:border lg:border-\[#E1E6EA\] lg:bg-white lg:px-5 lg:pb-7 lg:pt-7 lg:shadow-\[0_2px_8px_rgba\(25,32,36,0\.04\)\]"/,
  );
  assert.match(results, /<CarsResultsExperience[\s\S]*?results=\{initialResults\}/);
  assert.match(results, /createPortal\(\s*renderCarsSearchForm\("desktop-navbar"\),\s*desktopNavSearchTarget,\s*\)/);
  assert.match(results, /className="hidden bg-\[#f6f8fb\] pb-0 pt-7 sm:block lg:hidden"/);
  assert.doesNotMatch(results, /aria-label="Breadcrumb"/);
  assert.match(route, /<AppHeader[\s\S]*?flushDesktopBottom[\s\S]*?stableMobileSafeAreaTop[\s\S]*?hotelDesktopBoundary[\s\S]*?carsResultsDesktopSticky/);

  assert.match(loading, /aria-label="Loading car results"/);
  assert.match(loading, /data-cars-results-loading-hotel-column[\s\S]*?lg:max-w-\[928px\] lg:rounded-2xl lg:border lg:border-\[#E1E6EA\] lg:bg-white lg:px-5 lg:py-7 lg:shadow-\[0_2px_8px_rgba\(25,32,36,0\.04\)\]/);
  assert.match(loading, /results-loading-surface min-h-\[calc\(100svh-5rem\)\] flex-1 bg-\[#F5F7FB\] pb-8 sm:bg-\[#f6f8fb\] lg:bg-white lg:pb-12 lg:pt-6/);
  assert.match(results, /desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/);
  assert.equal(
    (results.match(/desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/g) ?? []).length,
    4,
    "full filter, compact filter, car card, and transition skeleton still receive the standalone desktop surface contract",
  );
});

test("desktop Cars results body is compact, centered, and keeps shared surfaces aligned", () => {
  assert.match(
    results,
    /data-cars-results-scroll-region[\s\S]*?data-cars-results-hotel-column[\s\S]*?lg:mt-0 lg:max-w-\[928px\] lg:rounded-2xl lg:border lg:border-\[#E1E6EA\] lg:bg-white lg:px-5 lg:pb-7 lg:pt-7/,
  );
  assert.match(
    results,
    /className="grid gap-5 lg:grid-cols-\[232px_minmax\(0,1fr\)\] xl:grid-cols-\[236px_minmax\(0,1fr\)\]"/,
  );
  const parse = (name: string, text: string) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const resultsTree = parse("CarsResultsClient.tsx", results), loadingTree = parse("SearchResultsLoadingTransition.tsx", loading);
  const nodes = <T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T) => {
    const found: T[] = [];
    function visit(node: ts.Node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
    visit(root); return found;
  };
  type Opening = ts.JsxOpeningElement | ts.JsxSelfClosingElement;
  const attribute = (node: Opening, name: string) => node.attributes.properties.find((item): item is ts.JsxAttribute => ts.isJsxAttribute(item) && item.name.getText() === name);
  const marked = (root: ts.Node, name: string) => {
    const found = nodes(root, (node): node is ts.JsxOpeningElement => ts.isJsxOpeningElement(node) && Boolean(attribute(node, name)));
    assert.equal(found.length, 1, `one ${name} owner`); return found[0];
  };
  const classes = (node: Opening, bindings: Record<string, unknown> = {}) => {
    const value = attribute(node, "className")?.initializer;
    assert.ok(value);
    if (ts.isStringLiteral(value)) return new Set(value.text.split(/\s+/));
    assert.ok(ts.isJsxExpression(value) && value.expression);
    return new Set<string>(runInNewContext(value.expression.getText(), { cn, ...bindings }).split(/\s+/));
  };
  const has = (tokens: Set<string>, expected: string[]) => { for (const token of expected) assert.ok(tokens.has(token), token); };
  const readyColumn = marked(resultsTree, "data-cars-results-hotel-column");
  assert.ok(ts.isJsxElement(readyColumn.parent));
  assert.equal(nodes(readyColumn.parent, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "CarsResultsExperience").length, 1);
  const providerShell = loadingTree.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "CarResultsShell");
  assert.ok(providerShell);
  const loadingColumn = marked(providerShell, "data-cars-results-loading-hotel-column");
  for (const column of [readyColumn, loadingColumn]) has(classes(column), ["lg:max-w-[928px]", "lg:rounded-2xl", "lg:border", "lg:border-[#E1E6EA]", "lg:bg-white", "lg:px-5"]);
  assert.equal(nodes(resultsTree, (node): node is ts.JsxOpeningElement => ts.isJsxOpeningElement(node) && Boolean(attribute(node, "data-cars-results-loading-hotel-column"))).length, 0, "provider loading is owned by the shared loader");
  const readyGrids = nodes(resultsTree, (node): node is ts.JsxOpeningElement => ts.isJsxOpeningElement(node) && attribute(node, "ref")?.initializer?.getText() === "{carsResultsBodyRef}");
  assert.equal(readyGrids.length, 1);
  assert.ok(ts.isJsxElement(loadingColumn.parent));
  const loadingGrids = nodes(loadingColumn.parent, (node): node is ts.JsxOpeningElement => ts.isJsxOpeningElement(node) && classesIfLiteral(node).includes("lg:grid-cols-[232px_minmax(0,1fr)]"));
  function classesIfLiteral(node: Opening) { const value = attribute(node, "className")?.initializer; return value && ts.isStringLiteral(value) ? value.text.split(/\s+/) : []; }
  assert.equal(loadingGrids.length, 1);
  for (const grid of [readyGrids[0], loadingGrids[0]]) has(classes(grid), ["grid", "gap-5", "lg:grid-cols-[232px_minmax(0,1fr)]", "xl:grid-cols-[236px_minmax(0,1fr)]"]);
  assert.ok(ts.isJsxElement(readyGrids[0].parent));
  const readyBody = readyGrids[0].parent;
  const sidebars = nodes(readyBody, (node): node is ts.JsxOpeningElement => ts.isJsxOpeningElement(node) && node.tagName.getText() === "aside");
  assert.equal(sidebars.length, 1);
  assert.ok(ts.isJsxElement(sidebars[0].parent));
  has(classes(sidebars[0]), ["hidden", "lg:block"]);
  const map = nodes(sidebars[0].parent, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "CarsResultsMapPreview");
  const filters = nodes(sidebars[0].parent, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "CarFilters" && attribute(node, "layout")?.initializer?.getText() === '"desktop"');
  const compactFilters = nodes(sidebars[0].parent, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "CarFilters" && attribute(node, "layout")?.initializer?.getText() === '"compact"');
  assert.equal(map.length, 1); assert.equal(filters.length, 1);
  assert.equal(compactFilters.length, 1, "the conditional compact filter keeps its separate layout contract");
  assert.ok(map[0].getStart() < filters[0].getStart(), "map stays above filters in the ready sidebar");
  assert.equal(attribute(filters[0], "layout")?.initializer?.getText(), '"desktop"');
  const content = marked(readyBody, "data-cars-results-content-column");
  has(classes(content, { embedded: false, presentation: "standalone" }), ["min-w-0", "space-y-0", "sm:space-y-4", "lg:space-y-5"]);
  assert.ok(ts.isJsxElement(content.parent));
  const lists = nodes(content.parent, (node): node is ts.JsxOpeningElement => ts.isJsxOpeningElement(node) && Boolean(attribute(node, "data-cars-results-card-list")));
  assert.equal(lists.length, 2);
  for (const list of lists) has(classes(list, { embedded: false, presentation: "standalone", guidedPlanning: false, filterTransitionPhase: "idle", filterTransitionMobile: false }), ["w-full", "space-y-3.5", "sm:space-y-4", "max-sm:!mt-2", "lg:space-y-5"]);

  // The alert is a full-width card inside the selected provider's rate details.
  const alertTree = parse("CarPriceAlertControl.tsx", alert);
  const alertSurface = marked(alertTree, "data-cars-price-alert");
  const alertClasses = classes(alertSurface);
  has(alertClasses, ["flex", "w-full", "min-w-0", "rounded-xl", "border", "border-[#CFE0F8]", "bg-[#EEF6FF]"]);
  assert.ok(!alertClasses.has("inline-flex") && !alertClasses.has("shrink-0"), "do not restore the retired content-width pill");
  assert.ok(ts.isJsxElement(alertSurface.parent));
  const switches = nodes(alertSurface.parent, (node): node is ts.JsxOpeningElement => ts.isJsxOpeningElement(node) && node.tagName.getText() === "button" && attribute(node, "role")?.initializer?.getText() === '"switch"');
  assert.equal(switches.length, 1);
  assert.equal(attribute(switches[0], "aria-checked")?.initializer?.getText(), "{tracking}");
  const label = attribute(switches[0], "aria-label")?.initializer;
  assert.ok(label && ts.isJsxExpression(label) && label.expression);
  assert.equal(runInNewContext(label.expression.getText(), { t: (key: string) => { assert.equal(key, "carsResults.priceTracking.title"); return "Track car prices"; }, scope: { providerName: "Selected Seller" } }), "Track car prices for Selected Seller offer");
  assert.equal(nodes(resultsTree, (node): node is Opening => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText() === "CarPriceAlertControl").length, 0, "no results-summary or sidebar tracking control");
  const pickerTree = parse("CarDealPicker.tsx", readFileSync("src/components/results/CarDealPicker.tsx", "utf8"));
  const rateRow = marked(pickerTree, "data-car-rate-provider-alert-row");
  assert.ok(ts.isJsxElement(rateRow.parent));
  assert.match(rateRow.parent.getText(), /Booking provider · \{selectedGroup\.providerName\}/);
  const controls = nodes(rateRow.parent, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "CarPriceAlertControl");
  assert.equal(controls.length, 1);
  assert.equal(attribute(controls[0], "car")?.initializer?.getText(), "{car}");
  assert.equal(attribute(controls[0], "offer")?.initializer?.getText(), "{selectedOffer}");
  assert.equal(attribute(controls[0], "search")?.initializer?.getText(), "{search}");
  assert.doesNotMatch(providerShell.getText(), /ResultsAvailabilityNotice|AppHeader/);
  assert.doesNotMatch(results, /data-cars-price-alert-sidebar-slot/);
  assert.match(
    card,
    /hidden md:grid lg:grid-cols-\[192px_minmax\(0,1fr\)\] xl:grid-cols-\[200px_minmax\(0,1fr\)\]/,
  );
  assert.match(
    skeleton,
    /desktopSurfaceParity[\s\S]*?\? "lg:grid-cols-\[192px_minmax\(0,1fr\)\] xl:grid-cols-\[200px_minmax\(0,1fr\)\]"/,
  );
  assert.match(
    card,
    /<article[\s\S]*?relative w-full overflow-hidden/,
  );
  assert.match(
    card,
    /md:!h-\[220px\] md:!min-h-\[220px\] md:max-h-\[220px\] md:self-start lg:!h-\[176px\] lg:!min-h-\[176px\] lg:max-h-\[176px\]/,
    "the smaller media frame is limited to large-screen breakpoints",
  );
  assert.match(
    skeleton,
    /aspect-\[4\/3\] w-full rounded-xl lg:aspect-auto lg:h-\[176px\]/,
    "the desktop skeleton image matches the compact 176px frame",
  );
  assert.match(
    card,
    /data-car-card-mobile-image[\s\S]*?min-h-\[144px\]/,
    "the separately rendered mobile image retains its original minimum height",
  );
});

test("desktop Cars breathing room separates map, filters, toolbar and result cards without widening the column", () => {
  const map = readFileSync(new URL("./CarsResultsMapPreview.tsx", import.meta.url), "utf8");
  assert.match(results, /lg:mt-0 lg:max-w-\[928px\]/);
  assert.match(results, /lg:px-5 lg:pb-7 lg:pt-7/);
  assert.match(results, /data-cars-results-content-column className=\{cn\("min-w-0 space-y-0 sm:space-y-4", !embedded && presentation === "standalone" && "lg:space-y-5"\)\}/);
  assert.match(results, /rowClassName=\{cn\("pb-3\.5 sm:pb-4 focus:outline-none", !embedded && presentation === "standalone" && "lg:pb-5"\)\}/);
  assert.equal((results.match(/"max-sm:!mt-2 lg:space-y-5"/g) ?? []).length, 2);
  assert.match(map, /data-cars-results-map-preview/);
  assert.match(map, /className="relative mb-2 h-\[150px\][^"]*lg:mb-4"/);
  assert.match(loading, /data-cars-results-loading-hotel-column[\s\S]*?lg:max-w-\[928px\][\s\S]*?lg:px-5 lg:py-7/);
  assert.match(loading, /<div className="space-y-4 lg:space-y-5">[\s\S]*?<CarCardSkeleton desktopSurfaceParity \/>/);
  assert.doesNotMatch(results, /lg:max-w-\[1080px\]/);
});

test("desktop Cars keeps map and count-and-sort layout without a results-wide tracking bar", () => {
  assert.match(results, /lg:max-w-\[928px\] lg:rounded-2xl lg:border lg:border-\[#E1E6EA\]/);
  assert.match(results, /data-cars-results-content-column className=\{cn\("min-w-0 space-y-0 sm:space-y-4", !embedded && presentation === "standalone" && "lg:space-y-5"\)\}/);
  assert.match(results, /<CarsResultsMapPreview location=\{search\.pickupLocation\} \/>/);
  assert.doesNotMatch(results, /data-cars-price-alert-sidebar-slot|<CarPriceAlertControl|desktopCarPriceAlertTarget/);
  assert.match(results, /lg:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(loading, /lg:max-w-\[928px\]/);
  assert.doesNotMatch(results, /lg:max-w-\[1080px\]/);
});

test("desktop Cars filters use the Hotels white filter surface without changing mobile filters", () => {
  assert.match(
    results,
    /desktopSurfaceParity \? "bg-white" : "bg-transparent"/,
  );
  assert.match(
    results,
    /desktopSurfaceParity \? "bg-white" : "bg-\[#EEF3F8\]"/,
  );
  assert.match(
    results,
    /desktopSurfaceParity &&\s*layout !== "mobile" &&\s*"cars-desktop-filter-surface cars-hotel-filter-surface"/,
  );
  assert.doesNotMatch(results, /t\("carsResults\.filterBy"\)/);
  assert.match(
    results,
    /layout === "desktop"[\s\S]*?<h2 className="truncate[^"]*"[\s\S]*?\{t\("filters"\)\}/,
  );
  assert.match(
    styles,
    /\.desktop-filter-sidebar\.cars-desktop-filter-surface\.cars-hotel-filter-surface \{\s*background: #ffffff !important;\s*\}/,
  );
  assert.match(
    styles,
    /\.desktop-filter-sidebar\.cars-desktop-filter-surface\.cars-hotel-filter-surface\s*\.desktop-filter-sidebar__header \{\s*background: #ffffff !important;\s*\}/,
  );
  assert.match(
    styles,
    /\.cars-desktop-filter-icon \{\s*color: #07133b !important;\s*\}/,
  );
  assert.match(results, /layout === "mobile"[\s\S]*?"grid gap-6 bg-transparent"/);
  assert.match(results, /data-cars-mobile-filter-shell[\s\S]*?bg-\[#F2F4F8\]/);
});

test("desktop and mobile Cars result cards use the same pure-white surface", () => {
  assert.match(card, /desktopSurfaceParity = false/);
  assert.match(card, /border border-\[#D8E1EC\] bg-white shadow-\[0_2px_10px_rgba\(24,48,91,0\.08\)\] md:rounded-2xl/);
  assert.match(
    card,
    /md:rounded-2xl md:bg-white md:shadow/,
  );
  assert.doesNotMatch(card, /data-car-card-desktop-header-rail/);
  assert.match(card, /data-car-card-desktop-shared-header[\s\S]*?lg:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(card, /data-region="pricing"[\s\S]*?lg:!hidden/);
  assert.doesNotMatch(card, /md:bg-\[#E7EBF1\]/);
  assert.match(
    card,
    /data-region="image"[\s\S]*?bg-white[\s\S]*?aspect-\[4\/3\][^"]*bg-white/,
  );
  assert.match(
    card,
    /data-region="pricing"[\s\S]*?desktopSurfaceParity \? "bg-white" : "bg-slate-50\/45 lg:bg-white"/,
  );
  assert.match(
    card,
    /data-car-card-mobile-information\s+className="min-w-0 bg-white px-2\.5 pb-2 pt-\[7px\]"/,
  );
  assert.match(
    card,
    /data-car-card-mobile-lower-band\s+className="flex min-w-0 items-stretch border-t border-\[#CBD5E1\] bg-white"/,
  );
});

test("desktop and mobile car rates share an inline tracking control inside rate details", async () => {
  const picker = readFileSync(new URL("./CarDealPicker.tsx", import.meta.url), "utf8");
  const section = alert.match(/data-cars-price-alert className="([^"]+)"/)?.[1];
  assert.ok(section);
  const tokens = new Set(section.split(/\s+/));
  for (const token of ["mt-2", "flex", "w-full", "min-w-0", "items-center", "rounded-xl", "border", "border-[#CFE0F8]", "bg-[#EEF6FF]", "px-3", "py-1"]) assert.ok(tokens.has(token), token);
  assert.ok(!tokens.has("inline-flex") && !tokens.has("w-fit") && !tokens.has("shrink-0"), "do not restore the retired compact pill");
  assert.doesNotMatch(section, /sm:rounded-2xl|lg:bg-\[#EEF6FF\]/);
  assert.match(picker, /data-car-rate-provider-alert-row/);
  assert.match(picker, /<CarPriceAlertControl/);
  assert.match(results, /<main className="flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white pb-8 lg:pb-12 lg:pt-6">/);
  const tree = ts.createSourceFile("CarDealPicker.tsx", picker, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = <T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T) => {
    const found: T[] = [];
    function visit(node: ts.Node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
    visit(root); return found;
  };
  const attribute = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, name: string) => node.attributes.properties.find((prop): prop is ts.JsxAttribute => ts.isJsxAttribute(prop) && prop.name.getText() === name);
  const controls = nodes(tree, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "CarPriceAlertControl");
  assert.equal(controls.length, 1);
  for (const [name, value] of Object.entries({ car: "{car}", offer: "{selectedOffer}", search: "{search}", key: '{car.id + ":" + selectedOffer.id}' })) assert.equal(attribute(controls[0], name)?.initializer?.getText(), value, name);
  const row = controls[0].parent;
  assert.ok(ts.isJsxElement(row) && attribute(row.openingElement, "data-car-rate-provider-alert-row"));
  assert.match(row.getText(), /Booking provider · \{selectedGroup\.providerName\}/);
  assert.match(row.getText(), /flex min-w-0 flex-col items-stretch gap-1/);
  let parent: ts.Node | undefined = row.parent;
  while (parent && !(ts.isJsxElement(parent) && parent.openingElement.tagName.getText() === "dialog")) parent = parent.parent;
  assert.ok(parent, "the only alert belongs to the seller rate dialog");
  assert.doesNotMatch(results, /<CarPriceAlertControl\b|data-cars-price-alert-sidebar-slot/);
  assert.match(card, /<CarDealPicker[\s\S]*?compact[\s\S]*?expanded=\{offersExpanded\}/);
  assert.match(card, /data-region="details"[\s\S]*?<CarDealPicker/);
  // Header/notice are route-owned, not introduced by the rate picker or loader.
  assert.doesNotMatch(picker, /<AppHeader\b|<ResultsAvailabilityNotice\b/);
  assert.doesNotMatch(loading, /<AppHeader\b|<ResultsAvailabilityNotice\b/);
  assert.match(route, /<ResultsAvailabilityNotice\s*\/>[\s\S]*?<Suspense/);

  // Actual card/picker/alert and pure helpers; only ancillary contexts/visuals
  // and HTTP replies are fixtures. No backend mutation or provider clickout.
  const require = createRequire(import.meta.url);
  const modules: Record<string, string> = {};
  for (const [name, file] of Object.entries({ react: "react/cjs/react.production.js", "react-dom": "react-dom/cjs/react-dom.production.js", "react-dom/client": "react-dom/cjs/react-dom-client.production.js", "react/jsx-runtime": "react/cjs/react-jsx-runtime.production.js", scheduler: "scheduler/cjs/scheduler.production.js" })) modules[name] = readFileSync(`node_modules/${file}`, "utf8");
  modules["lucide-react"] = "const React=require('react');module.exports=new Proxy({}, {get:()=>props=>React.createElement('svg',{'aria-hidden':true,width:props.size||24,height:props.size||24})});";
  modules["next/link"] = "module.exports={__esModule:true,default:props=>require('react').createElement('a',props,props.children)};";
  modules["next/navigation"] = "exports.useRouter=()=>({push:url=>window.redirects.push(url)});";
  modules["@/components/region/RegionProvider"] = "exports.useRegion=()=>({selectedOption:{currency:'USD'}});";
  modules["@/components/currency/CurrencyRatesProvider"] = "exports.useCurrencyRates=()=>({rates:{USD:1},isFallback:false});";
  modules["@/components/layout/LocaleProvider"] = "exports.useLocale=()=>({t:{}});";
  modules["@/components/layout/RouteProgress"] = "exports.useRouteProgress=()=>({start:()=>{}});";
  modules["@/components/results/useSavedCar"] = "exports.useSavedCar=()=>({isSaved:false,toggleSavedCar:()=>{}});";
  modules["@/components/results/CarResultImage"] = "exports.CarResultImage=()=>null;";
  modules["@/components/results/CarsRouteLoadingOverlay"] = "exports.CarsRouteLoadingOverlay=()=>null;";
  function add(name: string, file: string) {
    if (Object.hasOwn(modules, name)) return;
    modules[name] = "";
    const raw = readFileSync(file, "utf8");
    let compiled = /\.tsx?$/.test(file) ? ts.transpileModule(raw, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText : raw;
    compiled = compiled.replace(/require\("([^"]+)"\)/g, (_call, dependency: string) => {
      if (Object.hasOwn(modules, dependency)) return `require(${JSON.stringify(dependency)})`;
      const location = dependency.startsWith("@/") ? `src/${dependency.slice(2)}` : dependency.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), dependency)) : relative(process.cwd(), require.resolve(dependency, { paths: [dirname(`${process.cwd()}/${file}`)] })).replaceAll("\\", "/");
      const resolved = [location, `${location}.ts`, `${location}.tsx`, `${location}/index.ts`, `${location}/index.js`].find((path) => existsSync(path) && statSync(path).isFile());
      assert.ok(resolved, `unexpected fixture dependency: ${dependency}`);
      const id = `file:${resolved}`;
      add(id, resolved);
      return `require(${JSON.stringify(id)})`;
    });
    modules[name] = compiled;
  }
  add("card", "src/components/results/CarResultCard.tsx");
  const bundle = `const registry={${Object.entries(modules).map(([name, code]) => `${JSON.stringify(name)}:function(require,module,exports){${code}\n}`).join(",")}},cache={};function require(name){if(cache[name])return cache[name].exports;if(!registry[name])throw Error(name);const module={exports:{}};cache[name]=module;registry[name](require,module,module.exports);return module.exports;}`;
  const fixture = `
    const React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom'),{CarResultCard}=require('card');
    window.calls=[];window.alerts=[];window.redirects=[];window.failLookup=false;
    window.fetch=async(url,options={})=>{const method=options.method||'GET',body=options.body?JSON.parse(options.body):null;window.calls.push({url,method,body});const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});if(url==='/api/price-alerts'&&method==='GET'){if(window.failLookup)throw new TypeError('Fixture lookup failure');return reply({alerts:window.alerts});}if(url==='/api/price-alerts'&&method==='POST'){const alert={...body,id:'fixture-alert',status:'ACTIVE'};window.alerts.push(alert);if(window.deferCreate)return new Promise(resolve=>window.finishCreate=()=>resolve(reply({alert},201)));return reply({alert},201);}if(url==='/api/price-alerts/fixture-alert'&&method==='PATCH'){const alert=window.alerts.find(a=>a.id==='fixture-alert');if(!alert)throw Error('Unknown alert');Object.assign(alert,body);return reply({alert});}throw Error('Unexpected request '+method+' '+url);};
    const offers=Array.from({length:4},(_,i)=>({id:'offer-'+i,bookingProviderName:'Seller '+i,rentalCompanyName:'Rental '+i,totalPrice:100+i*10,pricePerDay:25+i*2.5,currency:'USD',bookingUrl:'https://sandbox-en-us.kayakaffiliates.com/in?offer='+i,suppliedFacts:[{label:'Pickup · address',value:'Fixture pickup '+i}]}));
    const car={id:'car-a',modelName:'Fixture Car',category:'compact',categoryLabel:'Compact',passengers:5,bags:2,doors:4,transmission:'automatic',fuelPolicy:'full-to-full',mileagePolicy:'unlimited',inventorySource:'kayak-sandbox',offers};
    const search={pickupLocation:'Fixture',pickupDate:'2026-11-15',dropoffDate:'2026-11-19',pickupTime:'10:00',dropoffTime:'10:00',driverAge:'30'};
    const root=createRoot(document.getElementById('root'));let identity=1;window.reset=()=>flushSync(()=>root.render(React.createElement(CarResultCard,{key:identity++,car,search,presentation:'standalone',desktopSurfaceParity:true})));window.reset();
  `;
  const { chromium } = require("playwright") as typeof import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
      await context.route("**/*", (request) => request.abort());
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setContent('<div id="root"></div>');
      await page.addScriptTag({ content: bundle + fixture });
      // Structural responsive ownership, not a claim of CSS/device geometry.
      const ownerSelector = width < 768 ? "[data-car-card-mobile-offers]" : '[data-region="details"]';
      const open = async () => { await page.locator(`${ownerSelector} [data-car-rate-info]`).nth(1).click(); await page.waitForFunction("document.querySelector('dialog[open] [role=switch]')!==null"); };
      await open();
      const dialog = page.locator("dialog[open]");
      const control = dialog.locator("[data-cars-price-alert]");
      const button = dialog.getByRole("switch", { name: "Track car prices for Seller 1 offer", exact: true });
      assert.equal(await control.count(), 1);
      assert.equal(await page.locator("[data-cars-price-alert]").count(), 1, "no hidden sibling/sidebar alert");
      assert.equal(await control.locator('[role="switch"]').count(), 1);
      await page.waitForFunction("!document.querySelector('dialog[open] [role=switch]').disabled");
      assert.equal(await button.getAttribute("aria-checked"), "false");
      assert.equal(await button.getAttribute("aria-busy"), "false");
      assert.match(await dialog.textContent() ?? "", /Booking provider · Seller 1/);
      assert.match(await dialog.textContent() ?? "", /\$110\.00/);
      assert.match(await dialog.textContent() ?? "", /Fixture pickup 1/);
      const booking = dialog.locator('a[aria-label="View deal from Seller 1"]');
      const href = "https://sandbox-en-us.kayakaffiliates.com/in?offer=1";
      const assertBooking = async () => {
        assert.equal(await booking.getAttribute("href"), href);
        assert.equal(await booking.getAttribute("target"), "_blank");
        assert.equal(await booking.getAttribute("rel"), "noopener noreferrer");
        assert.ok(await booking.isVisible());
      };
      await assertBooking();
      await page.evaluate("window.deferCreate=true");
      await button.click();
      await page.waitForFunction("typeof window.finishCreate==='function'");
      assert.equal(await button.getAttribute("aria-busy"), "true");
      assert.equal(await button.getAttribute("aria-checked"), "true");
      await assertBooking();
      await page.evaluate("window.finishCreate()");
      await page.waitForFunction("document.querySelector('dialog[open] [role=switch]').getAttribute('aria-busy')==='false'");
      assert.equal(await button.getAttribute("aria-checked"), "true");
      const payload = await page.evaluate("window.calls.find(c=>c.method==='POST').body") as { query: { offer: { resultId: string; offerId: string; providerName: string } }; baselinePrice: number; currency: string };
      assert.deepEqual(payload.query.offer, { resultId: "car-a", offerId: "offer-1", providerName: "Seller 1" });
      assert.equal(payload.baselinePrice, 110);
      assert.equal(payload.currency, "USD");
      await assertBooking();
      await button.click();
      await page.waitForFunction("document.querySelector('dialog[open] [role=switch]').getAttribute('aria-busy')==='false'");
      assert.equal(await button.getAttribute("aria-checked"), "false");
      await assertBooking();
      await page.keyboard.press("Escape");
      await page.evaluate("window.failLookup=true;window.reset()");
      await open();
      const lookupError = dialog.getByRole("alert");
      await lookupError.waitFor();
      assert.match(await lookupError.textContent() ?? "", /could not load your alerts/i);
      assert.ok(await button.isDisabled());
      assert.equal(await button.getAttribute("aria-busy"), "false");
      const description = await button.getAttribute("aria-describedby");
      assert.ok(description);
      assert.equal(await lookupError.locator(`[id="${description}"]`).count(), 1);
      await assertBooking();
      await page.evaluate("window.failLookup=false;window.calls=[]");
      await lookupError.getByRole("button", { name: "Try again", exact: true }).click();
      await page.waitForFunction("!document.querySelector('dialog[open] [role=switch]').disabled");
      assert.equal(await lookupError.count(), 0);
      assert.equal(await button.getAttribute("aria-checked"), "false");
      assert.deepEqual(await page.evaluate("window.calls.map(c=>c.method)"), ["GET"]);
      await assertBooking();
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await browser.close(); }
});

test("KAYAK car cards and loading canvases stay inside the same standalone desktop surface contract", () => {
  assert.match(
    results,
    /<CarResultCard[\s\S]*?desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/,
  );
  assert.match(
    results,
    /items=\{visibleResults\}[\s\S]*renderItem=\{car => \(\s*<CarResultCard/,
  );
  assert.match(
    loading,
    /data-cars-results-loading-hotel-column[\s\S]*?lg:border-\[#E1E6EA\] lg:bg-white/,
  );
  assert.match(skeleton, /desktopSurfaceParity = false/);
  assert.match(skeleton, /desktopSurfaceParity && "md:bg-white"/);
  assert.match(
    skeleton,
    /desktopSurfaceParity \? "md:bg-white lg:bg-white" : "lg:bg-white"/,
  );
  const parse = (name: string, text: string) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const resultsTree = parse("CarsResultsClient.tsx", results);
  const loadingTree = parse("SearchResultsLoadingTransition.tsx", loading);
  const nodes = <T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T) => {
    const found: T[] = [];
    function visit(node: ts.Node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
    visit(root);
    return found;
  };
  const attribute = (node: ts.JsxOpeningElement, name: string) => node.attributes.properties.find((item): item is ts.JsxAttribute => ts.isJsxAttribute(item) && item.name.getText() === name);
  const evaluate = (text: string, bindings: Record<string, unknown> = {}) => {
    const exports: Record<string, unknown> = {};
    runInNewContext(ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
      exports,
      require: (name: string) => {
        if (name === "react/jsx-runtime") return jsxRuntime;
        assert.equal(name, "@/lib/utils", "unexpected render dependency");
        return { cn };
      },
      ...bindings,
    });
    return exports;
  };
  type PlaceholderProps = { desktopSurfaceParity?: boolean; transitionMotion?: "pulse" | "shimmer" };
  const actual = evaluate(skeleton);
  const ActualSkeleton = actual.CarCardSkeleton as ComponentType<PlaceholderProps>;
  const renders: PlaceholderProps[] = [];
  const RecordingSkeleton = (props: PlaceholderProps) => {
    renders.push(props);
    return createElement(ActualSkeleton, props);
  };
  const lists = nodes(resultsTree, (node): node is ts.JsxOpeningElement => ts.isJsxOpeningElement(node) && Boolean(attribute(node, "data-cars-results-card-list")));
  assert.equal(lists.length, 2);
  const covering = lists.find((node) => attribute(node, "aria-busy")?.initializer?.getText() === '"true"');
  const ready = lists.find((node) => attribute(node, "aria-busy")?.initializer?.getText() === '"false"');
  assert.ok(covering && ready && ts.isJsxElement(covering.parent));
  assert.ok(ts.isParenthesizedExpression(covering.parent.parent) && ts.isConditionalExpression(covering.parent.parent.parent));
  const branch = covering.parent.parent.parent;
  assert.equal(branch.whenTrue, covering.parent.parent);
  assert.equal(branch.condition.getText(resultsTree), 'filterTransitionPhase === "covering"');
  const render = (text: string, bindings: Record<string, unknown>) => {
    const Fixture = evaluate(`exports.Fixture = () => (${text});`, bindings).Fixture as ComponentType;
    return renderToStaticMarkup(createElement(Fixture));
  };
  const assertThree = (html: string, parity: boolean, motion: "pulse" | "shimmer") => {
    assert.equal(renders.length, 3, "three actual placeholder renders");
    assert.equal((html.match(/aria-label="Loading car result"/g) ?? []).length, 3);
    for (const props of renders) {
      assert.equal(props.desktopSurfaceParity, parity);
      assert.equal(props.transitionMotion ?? "pulse", motion);
    }
    assert.equal((html.match(/cars-filter-card-skeleton/g) ?? []).length, motion === "shimmer" ? 3 : 0);
    assert.doesNotMatch(html, /<header\b|data-results-availability-notice/);
  };
  for (const embedded of [false, true]) for (const presentation of ["standalone", "guided-planning"]) for (const mobile of [false, true]) {
    renders.length = 0;
    const html = render(covering.parent.getText(resultsTree), {
      cn, CarCardSkeleton: RecordingSkeleton, embedded, presentation, guidedPlanning: presentation === "guided-planning",
      resultsListRef: null, filterTransitionPhase: "covering", filterTransitionMobile: mobile, filterTransitionMinHeight: 480,
    });
    assertThree(html, !embedded && presentation === "standalone", mobile ? "shimmer" : "pulse");
    assert.match(html, /data-cars-results-card-list="true" aria-busy="true"/);
    assert.match(html, /min-height:480px/);
    assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, 3);
  }

  // Provider loading owns a different shell; render its actual functions too.
  const declaration = (name: string) => {
    const node = loadingTree.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
    assert.ok(node, name);
    return node.getText(loadingTree);
  };
  const providerSurface = nodes(loadingTree, (node): node is ts.JsxOpeningElement => ts.isJsxOpeningElement(node) && Boolean(attribute(node, "data-cars-results-loading-hotel-column")));
  assert.equal(providerSurface.length, 1);
  assert.ok(ts.isJsxElement(providerSurface[0].parent));
  assert.equal(nodes(providerSurface[0].parent, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "CarCardSkeleton").length, 1, "the rendered provider placeholders belong inside the Cars loading column");
  const portals: unknown[] = [];
  const shells = evaluate([declaration("CarResultsShell"), declaration("LoadingReveal"), declaration("ResultsShell"), "exports.Shell = ResultsShell;"].join("\n"), {
    Skeleton: actual.Skeleton, CarCardSkeleton: RecordingSkeleton,
    createPortal: (_child: unknown, target: unknown) => { portals.push(target); return null; },
    HeaderSearchSkeleton: () => null, MobileSearchSkeleton: () => null,
  });
  const Shell = shells.Shell as ComponentType<Record<string, unknown>>;
  for (const provided of [true, false]) {
    renders.length = 0; portals.length = 0;
    const html = renderToStaticMarkup(createElement(Shell, {
      searchType: "car", mobileHeaderProvided: provided, desktopHeaderProvided: provided,
      headerSlots: { desktopSearch: { id: "desktop" }, mobileSearch: { id: "mobile" }, mobileFilters: null },
    }));
    assertThree(html, true, "pulse");
    assert.match(html, /data-cars-results-loading-hotel-column/);
    assert.equal((html.match(/class="results-loading-reveal"/g) ?? []).length, 3);
    assert.equal(portals.length, provided ? 0 : 2, "provided headers must not be recreated");
  }
  const providerBranch = nodes(resultsTree, (node): node is ts.IfStatement => ts.isIfStatement(node) && node.expression.getText(resultsTree) === "providersLoading");
  assert.equal(providerBranch.length, 1);
  const transitions = nodes(providerBranch[0], (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText(resultsTree) === "SearchResultsLoadingTransition");
  assert.equal(transitions.length, 1);
  let transitionProps: Record<string, unknown> | undefined;
  render(transitions[0].getText(resultsTree), {
    providersLoading: true, search: { pickupLocation: "Fixture", pickupDate: "2030-01-01", dropoffDate: "2030-01-03", pickupTime: "10:00", dropoffTime: "10:00", driverAge: "30" },
    SearchResultsLoadingTransition: (props: Record<string, unknown>) => { transitionProps = props; return null; },
  });
  assert.ok(transitionProps);
  assert.equal(transitionProps.searchType, "car");
  assert.equal(transitionProps.active, true);
  assert.equal(transitionProps.mobileHeaderProvided, true);
  assert.equal(transitionProps.desktopHeaderProvided, true);

  // The ready branch owns cards, not placeholders; retain its parity binding.
  assert.ok(ts.isJsxElement(ready.parent));
  assert.equal(nodes(ready.parent, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "VirtualResultsList").length, 1);
  assert.equal(nodes(ready.parent, (node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText() === "CarCardSkeleton").length, 0);
  const readyCards = nodes(ready.parent, (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "CarResultCard");
  assert.equal(readyCards.length, 1);
  const parity = readyCards[0].attributes.properties.find((item): item is ts.JsxAttribute => ts.isJsxAttribute(item) && item.name.getText() === "desktopSurfaceParity");
  assert.ok(parity?.initializer && ts.isJsxExpression(parity.initializer) && parity.initializer.expression);
  for (const embedded of [false, true]) for (const presentation of ["standalone", "guided-planning"]) {
    assert.equal(runInNewContext(parity.initializer.expression.getText(resultsTree), { embedded, presentation }), !embedded && presentation === "standalone");
  }
  const routeTree = parse("cars-page.tsx", route);
  const suspense = nodes(routeTree, (node): node is ts.JsxElement => ts.isJsxElement(node) && node.openingElement.tagName.getText() === "Suspense");
  assert.equal(suspense.length, 1);
  const routeOwner = suspense[0].parent;
  assert.ok(ts.isJsxElement(routeOwner));
  const isNotice = (node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement => (ts.isJsxElement(node) && node.openingElement.tagName.getText() === "ResultsAvailabilityNotice") || (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "ResultsAvailabilityNotice");
  const notice = routeOwner.children.filter(isNotice);
  assert.equal(notice.length, 1, "the canonical route owns one notice outside Suspense");
  assert.ok(notice[0].getStart() < suspense[0].getStart());
  assert.equal(nodes(suspense[0], isNotice).length, 0);
  assert.equal(nodes(loadingTree, isNotice).length, 0);
  assert.equal(nodes(parse("BrandedLoading.tsx", readFileSync("src/components/layout/BrandedLoading.tsx", "utf8")), isNotice).length, 0);
});

test("narrowed desktop white column encompasses map, filters, full toolbar and narrower result cards", () => {
  const shell = results.indexOf('data-cars-results-scroll-region');
  const experience = results.indexOf('<CarsResultsExperience', shell);
  const grid = results.indexOf('ref={carsResultsBodyRef}', experience);
  const map = results.indexOf('<CarsResultsMapPreview', grid);
  const filters = results.indexOf('<CarFilters', map);
  const toolbar = results.indexOf('data-cars-results-toolbar', filters);
  const cards = results.indexOf('data-cars-results-card-list', toolbar);
  assert.ok(shell >= 0 && experience > shell && grid > experience);
  assert.ok(map > grid && filters > map && toolbar > filters && cards > toolbar);
  assert.match(results, /className="grid gap-5 lg:grid-cols-\[232px_minmax\(0,1fr\)\] xl:grid-cols-\[236px_minmax\(0,1fr\)\]"/);
  assert.match(results, /<CarsResultsMapPreview location=\{search\.pickupLocation\} \/>/);
  assert.match(results, /data-cars-results-card-list[\s\S]*?<CarResultCard/);
  assert.match(results, /desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/);
});
