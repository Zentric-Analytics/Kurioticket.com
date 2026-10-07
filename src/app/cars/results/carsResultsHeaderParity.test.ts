import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const carsSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const loadingSource = readFileSync(new URL("./loading.tsx", import.meta.url), "utf8");
const appHeaderSource = readFileSync(
  new URL("../../../components/layout/AppHeader.tsx", import.meta.url),
  "utf8",
);
const safeAreaSource = readFileSync(
  new URL("../../../components/results/CarsResultsMobileSafeArea.tsx", import.meta.url),
  "utf8",
);
const carsClientSource = readFileSync(
  new URL("../../../components/results/CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const globalStyles = readFileSync(
  new URL("../../globals.css", import.meta.url),
  "utf8",
);
const mobileResultsStyles = readFileSync(
  new URL("../../../components/results/HotelResultsMobile.module.css", import.meta.url),
  "utf8",
);
const flightsSource = readFileSync(
  new URL("../../flights/results/page.tsx", import.meta.url),
  "utf8",
);

const getAppHeader = (source: string) =>
  [...source.matchAll(/<AppHeader\b[\s\S]*?\/>/g)]
    .map(([header]) => header)
    .find((header) => header.includes("flushDesktopBottom")) ?? "";

test("Cars Results keeps the standard AppHeader and opts into the inline mobile Cars search", () => {
  const carsHeader = getAppHeader(carsSource);
  const flightsHeader = getAppHeader(flightsSource);

  assert.ok(carsHeader, "Cars Results must continue rendering AppHeader");
  for (const prop of [
    "flushDesktopBottom",
    "flushMobileBottom",
    "hideDesktopTravelNav",
    "hideMobileCategoryTabs",
    "stableMobileSafeAreaTop",
    "carsResultsDesktopSticky",
    "carsResultsMobileInlineSearch",
  ]) {
    assert.match(carsHeader, new RegExp("\\b" + prop + "\\b"));
  }
  for (const mobileProp of ["flushMobileBottom", "hideMobileCategoryTabs"]) {
    assert.match(flightsHeader, new RegExp("\\b" + mobileProp + "\\b"));
  }
  assert.doesNotMatch(carsHeader, /mobileResultsSearch=/);
  assert.doesNotMatch(carsHeader, /mobileSurface="muted"/);
});

test("AppHeader replaces the Cars mobile mark with back navigation and keeps desktop branding", () => {
  const carsInlineBranch = appHeaderSource.indexOf(
    "{carsResultsMobileInlineSearch ? (",
  );
  const backButton = appHeaderSource.indexOf(
    "data-cars-results-mobile-back",
    carsInlineBranch,
  );
  const fullLogo = appHeaderSource.indexOf(
    'src="/brand/kurioticket-logo-primary-light-bg.svg"',
    backButton,
  );
  const searchSlot = appHeaderSource.indexOf(
    "data-cars-results-mobile-nav-search",
    fullLogo,
  );
  const mobileActions = appHeaderSource.indexOf(
    'className={cn("flex items-center gap-0 md:hidden"',
    searchSlot,
  );

  assert.ok(carsInlineBranch >= 0);
  assert.ok(backButton > carsInlineBranch);
  assert.ok(fullLogo > backButton);
  assert.ok(searchSlot > fullLogo);
  assert.ok(mobileActions > searchSlot);
  assert.doesNotMatch(appHeaderSource, /data-cars-results-mobile-nav-filter/);
  assert.match(appHeaderSource, /carsResultsMobileInlineSearch\?: boolean/);
  assert.match(
    appHeaderSource,
    /aria-label="Back"[\s\S]*?data-cars-results-mobile-back[\s\S]*?router\.back\(\)[\s\S]*?router\.push\("\/cars"\)[\s\S]*?sm:hidden/,
  );
  assert.match(
    appHeaderSource,
    /kurioticket-logo-primary-light-bg\.svg[\s\S]*?className="h-8 w-auto md:h-9 lg:h-9"/,
  );
  assert.match(
    appHeaderSource,
    /\(\(mobileResultsSearch && mobileResultsSticky\) \|\| carsResultsMobileInlineSearch\)[\s\S]*?"max-sm:sticky max-sm:top-0 max-sm:z-\[950\]"/,
  );
  assert.match(
    carsClientSource,
    /createPortal\(renderMobileHeaderSearch\(\), mobileNavSearchTarget\)/,
  );
});

test("Cars Results owns a permanent non-interactive mobile safe-area guard that is white by default", () => {
  assert.match(carsSource, /<CarsResultsMobileSafeArea \/>/);
  assert.match(safeAreaSource, /data-cars-results-mobile-safe-area/);
  assert.match(
    safeAreaSource,
    /pointer-events-none fixed inset-x-0 top-0 z-\[100\] h-\[var\(--cars-results-safe-area-top\)\] sm:hidden/,
  );
  assert.match(
    safeAreaSource,
    /backgroundColor: "var\(--cars-results-safe-area-surface, #ffffff\)"/,
  );
  assert.doesNotMatch(
    safeAreaSource,
    /<style>|html:has|translate-y-0|useLayoutEffect|ResizeObserver|requestAnimationFrame|addEventListener/,
  );
});

test("the unified header keeps a white safe area while the full Filters overlay can intentionally override it", () => {
  assert.doesNotMatch(
    safeAreaSource,
    /--cars-results-safe-area-surface:\s*#F2F4F8/,
  );
  assert.match(
    carsClientSource,
    /if \(!filtersOpen \|\| typeof window === "undefined"\) return undefined;[\s\S]*?safeAreaSurfaceProperty = "--cars-results-safe-area-surface";[\s\S]*?root\.style\.setProperty\(safeAreaSurfaceProperty, "#F2F4F8"\);/,
  );
  assert.match(
    carsClientSource,
    /distance >= \(nextDirection > 0 \? 20 : 12\)[\s\S]*setMobileFiltersVisible\(nextDirection < 0\)/,
  );
  assert.doesNotMatch(
    carsClientSource,
    /data-cars-results-mobile-header-filter|mobileNavFilterTarget|showMobileHeaderFilter/,
  );
});

test("Cars Results uses the browser static max top inset so Safari scroll chrome cannot collapse the protected region", () => {
  assert.match(
    globalStyles,
    /--cars-results-safe-area-top:\s*max\(\s*env\(safe-area-inset-top\),\s*env\(safe-area-max-inset-top, 0px\)\s*\);/,
  );
  assert.doesNotMatch(safeAreaSource, /safe-area-inset-top|safe-area-max-inset-top/);
  assert.doesNotMatch(safeAreaSource, /44px|47px|50px|59px/);
});

test("Cars pinned mobile filters stay locked to the stable Cars header edge during Safari chrome changes", () => {
  assert.match(
    appHeaderSource,
    /page-shell flex flex-col gap-0\.5 pb-1 pt-\[5px\][\s\S]*min-h-\[52px\][\s\S]*carsResultsMobileInlineSearch/,
  );
  assert.match(
    mobileResultsStyles,
    /\.scrollFilterBarPinned\[data-cars-results-scroll-filter-bar\] \{[\s\S]*top: calc\(61px \+ var\(--cars-results-safe-area-top\)\);/,
  );
  assert.match(
    mobileResultsStyles,
    /\.scrollFilterBarPinned \{[\s\S]*top: calc\(72px \+ env\(safe-area-inset-top\)\);/,
  );
});

test("Cars Results preserves native top-edge reload while keeping the Hotels-style filter reveal", () => {
  assert.match(carsSource, /<CarsResultsMobileSafeArea \/>/);
  assert.match(loadingSource, /<CarsResultsMobileSafeArea \/>/);
  assert.match(safeAreaSource, /data-cars-results-mobile-safe-area/);
  assert.doesNotMatch(
    globalStyles,
    /data-cars-results-mobile-safe-area[\s\S]{0,260}(?:overscroll-behavior-y:\s*none|overflow:\s*hidden|touch-action:\s*none)/,
  );
  assert.match(
    carsClientSource,
    /distance >= \(nextDirection > 0 \? 20 : 12\)[\s\S]*setMobileFiltersVisible\(nextDirection < 0\)/,
  );
});

test("Cars pinned filters blend into the white header while the natural rail keeps its existing results surface", () => {
  assert.match(
    mobileResultsStyles,
    /\.scrollFilterBarPinned \{[\s\S]*background:\s*#f5f7fb;/,
  );
  assert.doesNotMatch(
    mobileResultsStyles,
    /\.scrollFilterBar \{[^}]*background:\s*#fff(?:fff)?;/,
  );
  assert.match(
    mobileResultsStyles,
    /\.scrollFilterBarPinned\[data-cars-results-scroll-filter-bar\] \{[\s\S]*background:\s*#ffffff;[\s\S]*border-top:\s*0;[\s\S]*box-shadow:\s*none;/,
  );
  assert.match(
    carsClientSource,
    /data-scroll-pinned=\{mobileFiltersPinned \? "true" : "false"\}/,
  );
});

test("Cars mobile header and filter rail keep the Hotel white surface and curve through the scroll handoff", () => {
  const carsHeader = getAppHeader(carsSource);

  assert.match(carsHeader, /flushMobileBottom/);
  assert.doesNotMatch(carsHeader, /mobileSurface="muted"/);
  assert.match(
    appHeaderSource,
    /"relative z-50 border-b border-\[#D8E1EC\] bg-white[\s\S]*flushMobileBottom[\s\S]*"border-b-0 shadow-none sm:border-b/,
  );
  assert.match(
    mobileResultsStyles,
    /\.scrollFilterSlot \{[\s\S]*background: #fff;/,
  );
  assert.match(
    mobileResultsStyles,
    /\.scrollFilterBarPinned\[data-cars-results-scroll-filter-bar\] \{[\s\S]*background: #ffffff;[\s\S]*border-top: 0;[\s\S]*box-shadow: none;/,
  );
  assert.match(
    mobileResultsStyles,
    /\.scrollFilterSlot::after,[\s\S]*\.scrollFilterBarPinned\.hotelNavbarFilterBar::after,[\s\S]*\.scrollFilterBarPinned\[data-cars-results-scroll-filter-bar\]::after \{[\s\S]*width: 26px;[\s\S]*height: 26px;[\s\S]*M0%200%20Q13%2026%2026%2026%20L0%2026%20Z/,
  );
  assert.match(
    carsClientSource,
    /distance >= \(nextDirection > 0 \? 20 : 12\)[\s\S]*setMobileFiltersVisible\(nextDirection < 0\)/,
  );
  assert.match(
    carsClientSource,
    /if \(scrollY <= 1\) \{[\s\S]*setMobileFiltersPinned\(false\)[\s\S]*setMobileFiltersVisible\(true\)/,
  );
});

test("Cars Results does not independently render product category tabs", () => {
  const outsideHeader = carsSource.replace(getAppHeader(carsSource), "");
  assert.doesNotMatch(
    outsideHeader,
    /MobileCategoryTabs|TravelNav|categoryTabs/,
  );
});
