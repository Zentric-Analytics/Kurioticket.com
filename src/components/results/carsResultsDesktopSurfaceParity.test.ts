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
    /data-cars-price-alert[\s\S]*?className="mb-1 w-full min-w-0 max-w-full/,
  );
  assert.match(
    card,
    /hidden md:grid lg:grid-cols-\[220px_minmax\(0,1fr\)_152px\] xl:grid-cols-\[228px_minmax\(0,1fr\)_152px\]/,
  );
  assert.match(
    skeleton,
    /lg:grid-cols-\[220px_minmax\(0,1fr\)_152px\] xl:grid-cols-\[228px_minmax\(0,1fr\)_152px\]/,
  );
  assert.match(
    card,
    /<article[\s\S]*?relative w-full overflow-hidden/,
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

test("desktop car cards use the mobile information surface while preserving the white image section", () => {
  assert.match(card, /desktopSurfaceParity = false/);
  assert.match(
    card,
    /desktopSurfaceParity \? "md:bg-\[#E7EBF1\]" : "md:bg-white"/,
  );
  assert.match(
    card,
    /data-region="image"[\s\S]*?bg-white[\s\S]*?aspect-\[4\/3\][^"]*bg-white/,
  );
  assert.match(
    card,
    /data-region="pricing"[\s\S]*?desktopSurfaceParity \? "bg-\[#E7EBF1\]" : "bg-slate-50\/45 lg:bg-white"/,
  );
  assert.match(
    card,
    /data-car-card-mobile-information[\s\S]*?bg-\[#E7EBF1\]/,
  );
  assert.match(
    card,
    /data-car-card-mobile-lower-band[\s\S]*?bg-\[#E7EBF1\]/,
  );
});

test("desktop price alert uses a subtly lighter blue while mobile surfaces remain unchanged", () => {
  assert.match(
    alert,
    /bg-\[#EDF6FF\][^"]*sm:border-blue-100 sm:bg-\[#EDF6FF\][^"]*lg:bg-\[#F1F7FE\]/,
  );
  assert.match(
    alert,
    /lg:mx-auto lg:w-\[calc\(100%_-_12rem\)\]/,
  );
  assert.doesNotMatch(
    alert,
    /data-cars-price-alert[\s\S]{0,500}(?:sm|lg):bg-white/,
  );
});

test("KAYAK car cards and loading canvases stay inside the same standalone desktop surface contract", () => {
  assert.match(
    results,
    /<CarResultCard[\s\S]*?providerLabel=\{isKayakSandboxResult\(car\)[\s\S]*?desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/,
  );
  assert.match(
    results,
    /visibleResults\.map\(\(car\) => \(\s*<CarResultCard/,
  );
  assert.match(
    route,
    /<main className="flex min-h-\[calc\(100svh-5rem\)\] flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white">/,
  );
  assert.match(skeleton, /desktopSurfaceParity = false/);
  assert.match(skeleton, /desktopSurfaceParity && "md:bg-\[#E7EBF1\]"/);
  assert.match(
    skeleton,
    /desktopSurfaceParity \? "md:bg-\[#E7EBF1\] lg:bg-\[#E7EBF1\]" : "lg:bg-white"/,
  );
  assert.equal(
    (results.match(/<CarCardSkeleton desktopSurfaceParity \/>/g) ?? []).length,
    3,
  );
});
