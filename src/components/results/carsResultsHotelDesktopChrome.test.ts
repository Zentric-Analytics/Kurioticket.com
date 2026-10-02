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

test("desktop Cars navbar search uses the approved flat Hotels-style shell", () => {
  assert.match(
    cars,
    /placement: "desktop-full" \| "desktop-navbar" \| "desktop-sticky" \| "mobile"/,
  );
  assert.match(cars, /const isNavbarSearch = placement === "desktop-navbar"/);
  assert.match(
    cars,
    /isNavbarSearch[\s\S]*?"rounded-xl border border-\[#CFD9E5\] bg-white p-0 shadow-\[0_6px_20px_-13px_rgba\(20,32,51,0\.28\)\] ring-0"/,
  );
  assert.match(
    cars,
    /const isCompactSearch = placement === "desktop-sticky" \|\| isNavbarSearch/,
  );
  assert.match(
    cars,
    /className=\{cn\("mx-auto w-full min-w-0", isNavbarSearch \? "max-w-full" : "max-w-5xl"/,
  );
  assert.match(cars, /\{t\("search"\)\}/);
});

test("Cars keeps tablet search but removes the duplicate desktop page search band", () => {
  assert.match(
    cars,
    /className="hidden bg-white pb-0 pt-7 sm:block lg:hidden"[\s\S]*?renderCarsSearchForm\("desktop-full"\)/,
  );
  assert.match(
    cars,
    /aria-label="Breadcrumb"[\s\S]*?className="page-shell hidden pt-12 sm:block lg:pt-7"/,
  );
  assert.equal(
    (cars.match(/renderCarsSearchForm\("desktop-full"\)/g) ?? []).length,
    1,
    "desktop-full remains only for tablet fallback; desktop uses the navbar portal",
  );
});
