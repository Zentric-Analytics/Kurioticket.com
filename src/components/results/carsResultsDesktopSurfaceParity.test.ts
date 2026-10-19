import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
  assert.match(
    results,
    /data-cars-results-loading-hotel-column[\s\S]*?lg:max-w-\[928px\] lg:rounded-2xl[\s\S]*?lg:grid-cols-\[232px_minmax\(0,1fr\)\] xl:grid-cols-\[236px_minmax\(0,1fr\)\]/,
  );
  assert.match(alert, /data-cars-price-alert className="inline-flex min-w-0 shrink-0 items-center justify-end"/);
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
  assert.equal((results.match(/"max-sm:!mt-0 lg:space-y-5"/g) ?? []).length, 2);
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

test("desktop and mobile car rates share an inline tracking control inside rate details", () => {
  const picker = readFileSync(new URL("./CarDealPicker.tsx", import.meta.url), "utf8");
  const section = alert.match(/data-cars-price-alert className="([^"]+)"/)?.[1];
  assert.ok(section);
  assert.match(section, /inline-flex min-w-0 shrink-0 items-center justify-end/);
  assert.doesNotMatch(section, /sm:rounded-2xl|lg:bg-\[#EEF6FF\]/);
  assert.match(picker, /data-car-rate-provider-alert-row/);
  assert.match(picker, /<CarPriceAlertControl/);
  assert.match(results, /<main className="flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white pb-8 lg:pb-12 lg:pt-6">/);
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
  assert.equal(
    (results.match(/<CarCardSkeleton desktopSurfaceParity \/>/g) ?? []).length,
    3,
  );
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
