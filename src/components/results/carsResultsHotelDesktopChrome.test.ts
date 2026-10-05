import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const header = readFileSync(
  new URL("../layout/AppHeader.tsx", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL("../../app/cars/results/page.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

test("desktop Cars Results reuses the Hotels sticky header composition", () => {
  assert.match(header, /carsResultsDesktopSticky\?: boolean/);
  assert.match(
    header,
    /hotelResultsDesktopSticky \|\| flightResultsDesktopSticky \|\| carsResultsDesktopSticky/,
  );
  assert.match(header, /data-cars-results-desktop-header/);
  assert.match(header, /data-cars-results-nav-search/);
  assert.match(header, /lg:max-w-\[720px\] xl:max-w-\[820px\]/);
  assert.match(
    styles,
    /\[data-hotel-results-desktop-header\],\s*\[data-flight-results-desktop-header\],\s*\[data-cars-results-desktop-header\] \{\s*position: sticky;\s*top: 0;\s*z-index: 60;/,
  );
  assert.match(
    route,
    /<AppHeader[\s\S]*?hotelDesktopBoundary[\s\S]*?carsResultsDesktopSticky/,
  );
  assert.match(
    cars,
    /document\.querySelector<HTMLElement>\("\[data-cars-results-nav-search\]"\)/,
  );
  assert.match(
    cars,
    /createPortal\(\s*renderCarsSearchForm\("desktop-navbar"\),\s*desktopNavSearchTarget,\s*\)/,
  );
  assert.match(
    cars,
    /const showCompactSearchSummary =\s*!desktopNavSearchTarget &&\s*isSearchBarCompact &&\s*desktopStickySearchSection === null;/,
  );
});

test("desktop Cars navbar search uses the approved compact Hotels-style one-line treatment", () => {
  assert.match(
    cars,
    /placement: "desktop-full" \| "desktop-navbar" \| "desktop-sticky" \| "mobile"/,
  );
  assert.match(cars, /const isNavbarSearch = placement === "desktop-navbar"/);
  assert.match(cars, /data-cars-results-navbar-search=\{isNavbarSearch \? "" : undefined\}/);
  assert.match(cars, /data-cars-results-navbar-grid=\{isNavbarSearch \? "" : undefined\}/);
  assert.match(cars, /data-cars-results-navbar-field/);
  assert.match(cars, /data-cars-results-navbar-label/);
  assert.match(cars, /data-cars-results-navbar-value/);
  assert.match(cars, /data-cars-results-navbar-chevron/);
  assert.match(cars, /data-cars-results-navbar-submit=\{isNavbarSearch \? "" : undefined\}/);
  assert.match(cars, /navbarCompact=\{isNavbarSearch\}/);
  assert.match(cars, /navbarCompact[\s\S]*?\? `\$\{driverAge\}\+`/);
  assert.match(cars, /<Search className="h-\[18px\] w-\[18px\]" strokeWidth=\{2\.25\}/);

  assert.match(
    styles,
    /\[data-cars-results-navbar-grid\] \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 150px 140px 86px 46px !important;/,
  );
  assert.match(
    styles,
    /\[data-cars-results-navbar-search\] \[data-cars-results-navbar-field\] \{[\s\S]*?min-height: 44px !important;/,
  );
  assert.match(
    styles,
    /\[data-cars-results-navbar-search\] \[data-cars-results-navbar-label\] \{[\s\S]*?clip: rect\(0, 0, 0, 0\) !important;/,
  );
  assert.match(
    styles,
    /\[data-cars-results-navbar-search\] \.cars-results-navbar-location-value,[\s\S]*?font-size: 12px !important;[\s\S]*?font-weight: 650 !important;[\s\S]*?font-variation-settings: "wght" 650;/,
  );
  assert.match(
    styles,
    /\[data-cars-results-navbar-search\] \.cars-results-navbar-leading-icon \{[\s\S]*?color: #40536a !important;/,
  );
  assert.match(
    styles,
    /\[data-cars-results-navbar-search\] \[data-cars-results-navbar-chevron\] \{\s*display: none !important;/,
  );
  assert.match(
    styles,
    /\[data-cars-results-navbar-submit\] \{[\s\S]*?width: 44px !important;[\s\S]*?height: 44px !important;/,
  );
});

test("Cars keeps tablet search and removes the Cars breadcrumb/navigation completely", () => {
  assert.match(
    cars,
    /className="hidden bg-\[#f6f8fb\] pb-0 pt-7 sm:block lg:hidden"[\s\S]*?renderCarsSearchForm\("desktop-full"\)/,
  );
  assert.doesNotMatch(cars, /aria-label="Breadcrumb"/);
  assert.doesNotMatch(cars, />Home<|>Cars<|>Car results</);
  assert.match(
    cars,
    /data-cars-results-scroll-region[\s\S]*?lg:max-w-\[1020px\] lg:pt-5/,
  );
  assert.equal(
    (cars.match(/renderCarsSearchForm\("desktop-full"\)/g) ?? []).length,
    1,
    "desktop-full remains only for tablet fallback; desktop uses the navbar portal",
  );
});
