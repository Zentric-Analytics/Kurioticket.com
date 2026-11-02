import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const skeleton = readFileSync(new URL("../ui/Skeleton.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("Compare deals seller offers remain scoped without selection-triggered page loading", async () => {
  assert.match(cars, /const \[selectedDealOfferIds, setSelectedDealOfferIds\]/);
  assert.match(
    cars,
    /const selectCompareDealOffer = useCallback\([\s\S]*setSelectedDealOfferIds\([\s\S]*\[carId\]: offerId[\s\S]*\[\],[\s\S]*\);/,
  );
  assert.doesNotMatch(cars, /dealTransitionPhase|startDealResultsTransition/);
  assert.doesNotMatch(
    cars,
    /data-cars-results-page-transition=[\s\S]{0,120}"compare-deals"/,
  );
  const tree = ts.createSourceFile("CarsResultsClient.tsx", cars, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = <T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T) => {
    const found: T[] = [];
    function visit(node: ts.Node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
    visit(root); return found;
  };
  const owner = tree.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "CarsResultsExperience");
  assert.ok(owner?.body);
  const providerBranches = owner.body.statements.filter((node): node is ts.IfStatement => ts.isIfStatement(node) && node.expression.getText() === "providersLoading");
  assert.equal(providerBranches.length, 1);
  const loaders = nodes(providerBranches[0], (node): node is ts.JsxSelfClosingElement => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "SearchResultsLoadingTransition");
  assert.equal(loaders.length, 1);
  const attribute = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, name: string) => node.attributes.properties.find((prop): prop is ts.JsxAttribute => ts.isJsxAttribute(prop) && prop.name.getText() === name);
  for (const [name, value] of Object.entries({ searchType: '"car"', active: "{providersLoading}", searchKey: "{JSON.stringify(search)}" })) {
    assert.equal(attribute(loaders[0], name)?.initializer?.getText(), value, name);
  }
  for (const name of ["mobileHeaderProvided", "desktopHeaderProvided"]) {
    const flag = attribute(loaders[0], name);
    assert.ok(flag && (!flag.initializer || flag.initializer.getText() === "{true}"), name);
  }
  assert.doesNotMatch(cars, /CarsResultsPageTransitionSkeleton|data-cars-results-page-transition/);
  assert.equal(owner.body.statements.filter((node) => ts.isIfStatement(node) && node.expression.getText().includes('filterTransitionPhase === "covering"')).length, 0, "local covering must not return instead of the entire experience");
  const covering = nodes(owner, (node): node is ts.ConditionalExpression => ts.isConditionalExpression(node) && node.condition.getText() === 'filterTransitionPhase === "covering"' && node.whenTrue.getText().includes("data-cars-results-card-list"));
  assert.equal(covering.length, 1);
  const coverBody = ts.isParenthesizedExpression(covering[0].whenTrue) ? covering[0].whenTrue.expression : covering[0].whenTrue;
  assert.ok(ts.isJsxElement(coverBody));
  assert.ok(attribute(coverBody.openingElement, "data-cars-results-card-list"));
  assert.equal(attribute(coverBody.openingElement, "aria-busy")?.initializer?.getText(), '"true"');
  assert.match(covering[0].whenTrue.getText(), /Array\.from\(\{ length: 3 \}/);
  assert.match(covering[0].whenTrue.getText(), /desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/);
  let ancestor: ts.Node | undefined = covering[0].parent;
  while (ancestor && !(ts.isJsxElement(ancestor) && attribute(ancestor.openingElement, "data-cars-results-experience"))) ancestor = ancestor.parent;
  assert.ok(ancestor, "local covering stays within the current experience");
  const loadingSource = readFileSync(new URL("../layout/SearchResultsLoadingTransition.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(loadingSource, /<AppHeader\b|<ResultsAvailabilityNotice\b/);
  const route = readFileSync(new URL("../../app/cars/results/page.tsx", import.meta.url), "utf8");
  const routeTree = ts.createSourceFile("page.tsx", route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const suspense = nodes(routeTree, (node): node is ts.JsxElement => ts.isJsxElement(node) && node.openingElement.tagName.getText() === "Suspense");
  assert.equal(suspense.length, 1);
  assert.equal(attribute(suspense[0].openingElement, "key")?.initializer?.getText(), "{searchIdentity}");
  assert.ok(ts.isJsxElement(suspense[0].parent));
  const routeChildren = suspense[0].parent.children.filter(ts.isJsxSelfClosingElement);
  assert.equal(routeChildren.filter((node) => node.tagName.getText() === "ResultsAvailabilityNotice").length, 1);
  assert.equal(routeChildren.filter((node) => node.tagName.getText() === "AppHeader").length, 1);
  assert.doesNotMatch(suspense[0].getText(), /<ResultsAvailabilityNotice\b|<AppHeader\b/);
  assert.match(
    cars,
    /selectedDealOfferId=\{selectedDealOfferIds\[car\.id\]\}[\s\S]*onDealOfferSelected=\{selectCompareDealOffer\}/,
  );

  // Run the actual card and picker with real React in an isolated browser. Only
  // ancillary contexts/visuals are stubbed; provider grouping, URL validation,
  // pricing, disclosure, card expansion and picker dialog behavior are real.
  const modules: Record<string, string> = {};
  const read = (file: string) => readFileSync(file, "utf8");
  for (const [name, file] of Object.entries({ react: "react/cjs/react.production.js", "react-dom": "react-dom/cjs/react-dom.production.js", "react-dom/client": "react-dom/cjs/react-dom-client.production.js", "react/jsx-runtime": "react/cjs/react-jsx-runtime.production.js", scheduler: "scheduler/cjs/scheduler.production.js" })) modules[name] = read(`node_modules/${file}`);
  modules["lucide-react"] = "const React=require('react');module.exports=new Proxy({}, {get:(_,name)=>()=>React.createElement('svg',{'data-icon':String(name),'aria-hidden':true})});";
  modules["next/link"] = "module.exports={__esModule:true,default:props=>require('react').createElement('a',props,props.children)};";
  modules["@/components/region/RegionProvider"] = "exports.useRegion=()=>({selectedOption:{currency:'USD'}});";
  modules["@/components/currency/CurrencyRatesProvider"] = "exports.useCurrencyRates=()=>({rates:{USD:1},isFallback:false});";
  modules["@/components/layout/LocaleProvider"] = "exports.useLocale=()=>({t:{}});";
  modules["@/components/layout/RouteProgress"] = "exports.useRouteProgress=()=>({start:()=>{}});";
  modules["@/components/results/useSavedCar"] = "exports.useSavedCar=()=>({isSaved:false,toggleSavedCar:()=>{}});";
  modules["@/components/results/CarResultImage"] = "exports.CarResultImage=()=>null;";
  modules["@/components/results/CarsRouteLoadingOverlay"] = "exports.CarsRouteLoadingOverlay=()=>null;";
  modules["@/components/results/CarPriceAlertControl"] = "exports.CarPriceAlertControl=({car,offer})=>require('react').createElement('div',{'data-fixture-alert-car':car.id,'data-fixture-alert-offer':offer.id});";
  function addModule(name: string, file: string) {
    if (modules[name]) return;
    const compiled = ts.transpileModule(read(file), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    modules[name] = compiled;
    for (const match of compiled.matchAll(/require\("([^"]+)"\)/g)) {
      const dependency = match[1];
      if (modules[dependency]) continue;
      const location = dependency.startsWith("@/") ? `src/${dependency.slice(2)}` : dependency.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), dependency)) : null;
      assert.ok(location, `unexpected fixture dependency: ${dependency}`);
      const resolved = [".ts", ".tsx", "/index.ts", "/index.tsx"].map((extension) => location + extension).find(existsSync);
      assert.ok(resolved, dependency);
      addModule(dependency, resolved);
    }
  }
  addModule("@/components/results/CarResultCard", "src/components/results/CarResultCard.tsx");
  const registry = Object.entries(modules).map(([name, code]) => `${JSON.stringify(name)}:function(require,module,exports){${code}\n}`).join(",");
  const bundle = `const registry={${registry}},cache={};function require(name){if(cache[name])return cache[name].exports;if(!registry[name])throw Error(name);const module={exports:{}};cache[name]=module;registry[name](require,module,module.exports);return module.exports;}`;
  // This parent controls fixture inventory/remounts, not production filter timing.
  // It deliberately provides no seeded selected-offer collection.
  const fixture = `
    const React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom');
    const {CarResultCard}=require('@/components/results/CarResultCard');
    const offers=Array.from({length:4},(_,i)=>({id:'offer-'+i,bookingProviderName:'Seller '+i,rentalCompanyName:'Rental '+i,totalPrice:100+i*10,pricePerDay:25+i*2.5,currency:'USD',bookingUrl:'https://sandbox-en-us.kayakaffiliates.com/in?offer='+i,suppliedFacts:[{label:'Pickup · address',value:'Fixture pickup '+i},{label:'policy · fuel · code',value:'fullToFull'}]}));
    const original={id:'car-a',modelName:'Fixture Car',category:'compact',categoryLabel:'Compact',passengers:5,bags:2,doors:4,transmission:'automatic',fuelPolicy:'full-to-full',mileagePolicy:'unlimited',inventorySource:'kayak-sandbox',offers};
    const search={pickupLocation:'Fixture',pickupDate:'2026-11-15',dropoffDate:'2026-11-19',pickupTime:'10:00',dropoffTime:'10:00',driverAge:30};
    window.selectionCalls=[];
    function Parent(){const [car,setCar]=React.useState(original),[mounted,setMounted]=React.useState(true);window.fixture={remove:()=>flushSync(()=>setCar({...original,offers:offers.filter(o=>o.id!=='offer-1')})),invalid:()=>flushSync(()=>setCar({...original,offers:offers.map(o=>({...o,bookingUrl:'javascript:alert(1)'}))})),mount:value=>flushSync(()=>setMounted(value))};return mounted?React.createElement(CarResultCard,{car,search,presentation:'standalone',desktopSurfaceParity:true,onDealOfferSelected:(...args)=>window.selectionCalls.push(args)}):null;}
    const root=createRoot(document.getElementById('root'));let identity=1;window.resetSearch=()=>flushSync(()=>root.render(React.createElement(Parent,{key:++identity})));flushSync(()=>root.render(React.createElement(Parent,{key:identity})));
  `;
  // Load Playwright through Node, not JITI's TS/ESM transform of vendor internals.
  const { chromium } = createRequire(import.meta.url)("playwright") as typeof import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", (request) => request.abort());
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: bundle + fixture });
    const pricingHref = () => page.locator('[data-region="pricing"] a').getAttribute("href");
    const initialHref = await pricingHref();
    assert.equal(initialHref, "https://sandbox-en-us.kayakaffiliates.com/in?offer=0");
    const more = page.locator("[data-car-deal-more-offers]").first();
    const overflow = page.locator("[data-car-deal-provider-offer]").nth(3);
    assert.ok((await overflow.getAttribute("class"))?.split(/\s+/).includes("hidden"));
    await more.click();
    assert.equal(await more.getAttribute("aria-expanded"), "true");
    assert.ok(!(await overflow.getAttribute("class"))?.split(/\s+/).includes("hidden"));
    assert.equal(await pricingHref(), initialHref);
    assert.equal(await page.evaluate("window.selectionCalls.length"), 0);
    await more.click();
    assert.equal(await more.getAttribute("aria-expanded"), "false");
    assert.ok((await overflow.getAttribute("class"))?.split(/\s+/).includes("hidden"));
    assert.equal(await pricingHref(), initialHref);
    assert.equal(await page.locator('[role="status"], [data-cars-results-loading-hotel-column]').count(), 0, "seller disclosure does not trigger loading");
    const openSellerOne = async () => {
      await page.locator("[data-car-rate-info]").nth(1).click();
      const dialog = page.locator("dialog[open]");
      assert.equal(await dialog.count(), 1);
      assert.match(await dialog.textContent() ?? "", /Booking provider · Seller 1/);
      assert.match(await dialog.textContent() ?? "", /\$110\.00/);
      assert.match(await dialog.textContent() ?? "", /Fixture pickup 1/);
      assert.match(await dialog.textContent() ?? "", /Full to full/);
      assert.equal(await dialog.locator("[data-fixture-alert-offer]").getAttribute("data-fixture-alert-offer"), "offer-1");
      assert.equal(await dialog.locator("[data-fixture-alert-car]").getAttribute("data-fixture-alert-car"), "car-a");
      const link = dialog.locator("a");
      assert.equal(await link.getAttribute("href"), "https://sandbox-en-us.kayakaffiliates.com/in?offer=1");
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
    };
    await openSellerOne();
    assert.equal(await page.evaluate("window.selectionCalls.length"), 0);
    await page.keyboard.press("Escape");
    await page.waitForFunction("!document.querySelector('dialog[open]')");
    await more.click();
    await page.evaluate("window.fixture.mount(false)");
    assert.equal(await page.locator("[data-car-deal-picker]").count(), 0);
    await page.evaluate("window.fixture.mount(true)");
    assert.equal(await more.getAttribute("aria-expanded"), "false");
    assert.equal(await pricingHref(), initialHref);
    await openSellerOne();
    await page.evaluate("window.fixture.remove()");
    await page.waitForFunction("!document.querySelector('dialog[open]')");
    assert.equal(await page.locator('a[href$="offer=1"]').count(), 0, "removed offer has no stale actionable URL");
    assert.equal(await pricingHref(), initialHref);
    await page.evaluate("window.resetSearch()");
    assert.equal(await more.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert.equal(await page.evaluate("window.selectionCalls.length"), 0);
    await page.evaluate("window.fixture.invalid()");
    assert.equal(await page.locator("[data-car-deal-provider-offers] a, [data-region=pricing] a").count(), 0);
    assert.ok(await page.locator("[data-car-deal-provider-view-deal-unavailable]").count() > 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("Cars filter commits use a painted, cancellable covering and reveal lifecycle", () => {
  const start = cars.indexOf("const startFilterResultsTransition");
  const end = cars.indexOf("const toggleCarFilter", start);
  const transition = cars.slice(start, end);

  assert.match(transition, /getBoundingClientRect\(\)\.height/);
  assert.match(transition, /setFilterTransitionPhase\("covering"\)/);
  assert.match(transition, /requestAnimationFrame\(\(\) => \{[\s\S]*requestAnimationFrame/);
  assert.match(transition, /CARS_FILTER_MIN_BUSY_MS/);
  assert.match(transition, /setFilterTransitionPhase\("revealing"\)/);
  assert.match(transition, /setFilterTransitionPhase\("idle"\)/);
  assert.match(transition, /filterTransitionRunRef\.current !== run/);
  assert.match(transition, /cancelAnimationFrame/);
});

test("Cars filter covering preserves geometry and exposes one busy results region", () => {
  assert.match(cars, /filterTransitionMinHeight[\s\S]*\{ minHeight: filterTransitionMinHeight \}/);
  assert.match(cars, /aria-busy="true"/);
  assert.match(cars, /aria-hidden=\{filterTransitionPhase === "covering"/);
  assert.match(cars, /transitionMotion=[\s\S]*?"shimmer"/);
});

test("filtered results retain the subtle reveal language without applying it to Compare deals", () => {
  assert.equal((cars.match(/cars-filter-results-reveal/g) ?? []).length, 2);
  assert.match(styles, /cars-filter-results-reveal 160ms ease-out/);
});

test("the mobile filter skeleton shimmer is surface-only and reduced-motion safe", () => {
  assert.match(skeleton, /transitionMotion === "shimmer" && "cars-filter-card-skeleton"/);
  assert.match(styles, /\.cars-filter-card-skeleton \.animate-pulse/);
  assert.match(styles, /cars-filter-skeleton-shimmer 720ms ease-in-out infinite/);
  assert.match(styles, /prefers-reduced-motion: reduce[\s\S]*\.cars-filter-card-skeleton \.animate-pulse/);
});

test("quick-sheet drafts are immediate and Apply owns the results commit", () => {
  const sheet = cars.slice(cars.indexOf("data-cars-quick-sheet-backdrop"), cars.indexOf('aria-label="Back to top"'));
  assert.doesNotMatch(sheet, /setTimeout|Updating filters|disabled=/);
  assert.doesNotMatch(cars, /markQuickFilterUpdating|quickFilterFeedbackTimerRef/);
  assert.match(sheet, /onClick=\{\(\) => setQuickSortDraft\(option\.value\)\}/);
  assert.match(sheet, /onChange=\{\(\) => setQuickFilterDraft/);
  assert.match(sheet, /startFilterResultsTransition\(\)/);
  assert.match(sheet, /closeQuickFilter\(\)/);
});

test("the full mobile drawer defers its transition until changed filters become visible", () => {
  const handlers = cars.slice(
    cars.indexOf("const toggleMobileDrawerCarFilter"),
    cars.indexOf("const closeQuickFilter"),
  );
  const drawer = cars.slice(
    cars.indexOf("data-cars-mobile-filter-shell"),
    cars.indexOf("data-cars-quick-sheet-backdrop"),
  );

  assert.match(handlers, /const toggleMobileDrawerCarFilter[\s\S]*setSelectedCarFilters/);
  assert.match(handlers, /const clearMobileDrawerCarFilters[\s\S]*setSelectedCarFilters\(\{\}\)/);
  assert.doesNotMatch(
    handlers.slice(0, handlers.indexOf("const closeMobileFiltersDrawer")),
    /startFilterResultsTransition/,
  );
  assert.match(drawer, /onClear=\{clearMobileDrawerCarFilters\}/);
  assert.match(drawer, /onToggle=\{toggleMobileDrawerCarFilter\}/);
  assert.match(drawer, /onClick=\{clearMobileDrawerCarFilters\}/);
  assert.doesNotMatch(drawer, /onToggle=\{toggleCarFilter\}|onClick=\{clearCarFilters\}/);
});

test("every full mobile drawer exit compares its opening snapshot before closing", () => {
  const closeHandler = cars.slice(
    cars.indexOf("const closeMobileFiltersDrawer"),
    cars.indexOf("const openMobileFiltersDrawer"),
  );
  const openHandler = cars.slice(
    cars.indexOf("const openMobileFiltersDrawer"),
    cars.indexOf("const closeQuickFilter"),
  );
  const drawer = cars.slice(
    cars.indexOf("data-cars-mobile-filter-shell"),
    cars.indexOf("data-cars-quick-sheet-backdrop"),
  );

  assert.match(openHandler, /mobileFilterDrawerInitialFiltersRef\.current =[\s\S]*getSelectedCarFiltersSignature/);
  assert.match(closeHandler, /mobileFilterDrawerInitialFiltersRef\.current !==[\s\S]*getSelectedCarFiltersSignature\(selectedCarFiltersRef\.current\)/);
  assert.match(closeHandler, /if \(filtersChanged\) startFilterResultsTransition\(\);[\s\S]*setFiltersOpen\(false\)/);
  assert.equal((drawer.match(/onClick=\{closeMobileFiltersDrawer\}/g) ?? []).length, 2);
  assert.match(cars, /else closeMobileFiltersDrawer\(\)/);
  assert.match(cars, /onClick=\{closeMobileFiltersDrawer\}[\s\S]*`View \$\{visibleResults\.length\}/);
  assert.doesNotMatch(drawer, /onClick=\{\(\) => setFiltersOpen\(false\)\}/);
});

test("the drawer filter signature treats reordered and reverted selections as unchanged", async () => {
  const { getSelectedCarFiltersSignature } = await import("../../lib/cars/carFilterSelection");
  const opening = getSelectedCarFiltersSignature({
    vehicleType: ["suv", "small"],
    transmission: ["automatic"],
  });

  assert.equal(
    opening,
    getSelectedCarFiltersSignature({
      transmission: ["automatic"],
      vehicleType: ["small", "suv"],
    }),
  );
  assert.notEqual(opening, getSelectedCarFiltersSignature({ vehicleType: ["suv"] }));
});
