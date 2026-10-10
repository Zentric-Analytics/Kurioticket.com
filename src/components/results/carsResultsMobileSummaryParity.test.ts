import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const headerSearch = source.slice(
  source.indexOf("const renderMobileHeaderSearch"),
  source.indexOf("const renderCarsSearchForm"),
);

test("Cars mobile results exposes the real search values in the main header", () => {
  assert.match(headerSearch, /locationPairSummary/);
  assert.match(headerSearch, /mobileSearchSecondarySummary/);
  assert.match(headerSearch, /data-cars-results-mobile-header-search/);
  assert.match(
    source,
    /const mobileSearchSecondarySummary = `\$\{rentalDateSummary\} · \$\{timeSummary\} · \$\{driverAgeSummary\}`/,
  );
  assert.match(
    headerSearch,
    /aria-label=\{\`\$\{t\("deals\.results\.modifySearch"\)\}: \$\{locationPairSummary\}, \$\{mobileSearchSecondarySummary\}\`\}/,
  );
  assert.match(
    headerSearch,
    /openMobileSearchDrawer\([\s\S]*?event\.currentTarget[\s\S]*?getOverlayActivationModality\(event\)/,
  );
  assert.match(headerSearch, /data-cars-results-mobile-search-edit\s+aria-hidden="true"[\s\S]*?<SquarePen/);
  assert.match(headerSearch, /\[-webkit-tap-highlight-color:transparent\]/);
  assert.match(
    headerSearch,
    /focus-visible:ring-2 focus-visible:ring-\[#004BB8\]\/35/,
  );
});

test("Cars no longer renders a second normal or scrolled search summary", () => {
  assert.doesNotMatch(source, /renderMobileControlsRow/);
  assert.doesNotMatch(source, /renderMobileCompactResultsHeader/);
  assert.doesNotMatch(source, /mobileCompactHeaderVisible/);
  assert.doesNotMatch(source, /mobileCompactHeaderHandoffRef/);
  assert.doesNotMatch(source, /data-cars-mobile-compact-handoff/);
  assert.equal(
    (source.match(/data-cars-results-mobile-header-search/g) ?? []).length,
    1,
  );
});

test("the AppHeader owns the single mobile search while Edit Search keeps the existing drawer", () => {
  assert.match(
    source,
    /setMobileNavSearchTarget\([\s\S]*?\[data-cars-results-mobile-nav-search\]/,
  );
  assert.match(
    source,
    /mobileNavSearchTarget[\s\S]*?createPortal\(renderMobileHeaderSearch\(\), mobileNavSearchTarget\)/,
  );
  assert.match(
    source,
    /<MobileResultsEditSheet[\s\S]*?appearance="carsResultsEdit"/,
  );
  assert.match(source, /renderCarsSearchForm\("mobile"\)/);
});

test("the unified launcher uses the Hotels two-line hierarchy without cramped mini-fields", () => {
  assert.match(headerSearch, /h-full w-full min-w-0/);
  assert.match(headerSearch, /data-cars-results-mobile-search-summary/);
  assert.match(headerSearch, /flex min-w-0 flex-1 flex-col justify-center/);
  assert.match(headerSearch, /locationPairSummary/);
  assert.match(headerSearch, /mobileSearchSecondarySummary/);
  assert.match(headerSearch, /text-\[14px\] font-semibold leading-\[18px\]/);
  assert.match(headerSearch, /text-\[11px\] font-medium leading-\[15px\]/);
  assert.match(headerSearch, /data-cars-results-mobile-search-edit/);
  assert.match(headerSearch, /<SquarePen size=\{15\} strokeWidth=\{2\}/);
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-fields/);
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-location/);
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-dates/);
  assert.doesNotMatch(headerSearch, /grid-cols-|gap-\[3px\]|<CalendarDays|<Car/);
  assert.match(headerSearch, /bg-\[#F5F7FB\]/);
  assert.match(headerSearch, /hover:bg-\[#EDF2FA\]/);

  const editForm = source.slice(
    source.indexOf('appearance="carsResultsEdit"'),
    source.indexOf("</MobileResultsEditSheet>"),
  );
  assert.match(editForm, /renderCarsSearchForm\("mobile"\)/);
});
