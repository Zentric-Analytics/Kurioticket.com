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

test("standalone Cars Results matches the Hotels white desktop body while preserving mobile canvases", () => {
  assert.match(
    results,
    /<main className="flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white pb-8">/,
  );
  assert.match(
    results,
    /flex min-h-\[calc\(100svh-5rem\)\] flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white/,
  );
  assert.match(
    results,
    /fixed inset-0 z-\[1200\] overflow-hidden bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white/,
  );
  assert.doesNotMatch(
    results,
    /<main className="flex-1 bg-\[#F5F7FB\] pb-8">/,
  );
  assert.match(
    results,
    /<section[\s\S]*?className="hidden bg-\[#f6f8fb\] pb-0 pt-7 sm:block lg:hidden"/,
  );
  assert.match(
    results,
    /createPortal\(\s*renderCarsSearchForm\("desktop-navbar"\),\s*desktopNavSearchTarget,\s*\)/,
  );
  assert.doesNotMatch(results, /aria-label="Breadcrumb"/);
  assert.match(
    results,
    /data-cars-results-scroll-region[\s\S]*?className="page-shell max-sm:w-\[calc\(100%_-_28px\)\] pb-6 pt-0 sm:pt-6 lg:max-w-\[1020px\] lg:pt-5"/,
  );
  assert.match(
    results,
    /<main className="flex-1[^"]*lg:bg-white[^"]*pb-8">/,
  );
  assert.match(
    route,
    /<AppHeader[\s\S]*?flushDesktopBottom[\s\S]*?stableMobileSafeAreaTop[\s\S]*?hotelDesktopBoundary[\s\S]*?carsResultsDesktopSticky/,
  );
  assert.match(
    results,
    /desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/,
  );
  assert.equal(
    (
      results.match(
        /desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/g,
      ) ?? []
    ).length,
    4,
    "full filter, compact filter, car card, and transition skeleton all receive the standalone desktop surface contract",
  );
});

test("desktop Cars results body is compact, centered, and keeps shared surfaces aligned", () => {
  assert.match(
    results,
    /data-cars-results-scroll-region[\s\S]*?className="page-shell max-sm:w-\[calc\(100%_-_28px\)\] pb-6 pt-0 sm:pt-6 lg:max-w-\[1020px\] lg:pt-5"/,
  );
  assert.match(
    results,
    /className="grid gap-5 lg:grid-cols-\[232px_minmax\(0,1fr\)\] xl:grid-cols-\[236px_minmax\(0,1fr\)\]"/,
  );
  assert.match(
    results,
    /mx-auto max-w-\[1020px\] px-4 py-5 sm:py-6[\s\S]*?lg:grid-cols-\[232px_minmax\(0,1fr\)\] xl:grid-cols-\[236px_minmax\(0,1fr\)\]/,
  );
  assert.match(
    alert,
    /data-cars-price-alert[\s\S]*?className="col-start-2 row-start-1 mb-0 w-auto min-w-0 max-w-full/,
  );
  assert.match(
    card,
    /hidden md:grid lg:grid-cols-\[204px_minmax\(0,1fr\)_152px\] xl:grid-cols-\[212px_minmax\(0,1fr\)_152px\]/,
  );
  assert.match(
    skeleton,
    /lg:grid-cols-\[204px_minmax\(0,1fr\)_152px\] xl:grid-cols-\[212px_minmax\(0,1fr\)_152px\]/,
  );
  assert.match(
    card,
    /<article[\s\S]*?relative w-full overflow-hidden/,
  );
  assert.match(
    card,
    /md:!h-\[220px\] md:!min-h-\[220px\] md:max-h-\[220px\] md:self-start lg:!h-\[200px\] lg:!min-h-\[200px\] lg:max-h-\[200px\]/,
    "the smaller media frame is limited to large-screen breakpoints",
  );
  assert.match(
    skeleton,
    /aspect-\[4\/3\] w-full rounded-xl lg:aspect-auto lg:h-\[200px\]/,
    "the desktop skeleton image matches the compact 200px frame",
  );
  assert.match(
    card,
    /data-car-card-mobile-image[\s\S]*?min-h-\[144px\]/,
    "the separately rendered mobile image retains its original minimum height",
  );
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
  assert.match(card, /data-car-card-desktop-header-rail[\s\S]*?bg-white/);
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

test("desktop price alert retains blue styling while mobile tracking sits directly on the page", () => {
  const section = alert.match(/data-cars-price-alert\s+className="([^"]+)"/)?.[1];
  assert.ok(section);
  assert.match(section, /bg-transparent px-0 py-0/);
  assert.match(section, /sm:rounded-2xl sm:border sm:border-blue-100 sm:bg-\[#EDF6FF\] sm:px-4 sm:py-1 sm:shadow-sm/);
  assert.match(section, /lg:mx-auto lg:w-\[calc\(100%_-_12rem\)\] lg:bg-\[#F1F7FE\]/);
  assert.doesNotMatch(section.split("sm:")[0], /border|rounded|shadow|bg-\[#/);
  assert.match(results, /<main className="flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white pb-8">/);
  assert.doesNotMatch(section, /(?:sm|lg):bg-white/);
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
    route,
    /<main className="flex min-h-\[calc\(100svh-5rem\)\] flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white">/,
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
