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
  assert.match(headerSearch, /rentalDateSummary/);
  assert.match(headerSearch, /data-cars-results-mobile-header-search/);
  assert.match(
    headerSearch,
    /aria-label=\{\`\$\{t\("deals\.results\.modifySearch"\)\}: \$\{locationPairSummary\}, \$\{rentalDateSummary\}\`\}/,
  );
  assert.match(
    headerSearch,
    /openMobileSearchDrawer\([\s\S]*?event\.currentTarget[\s\S]*?getOverlayActivationModality\(event\)/,
  );
  assert.match(headerSearch, /<SquarePen[\s\S]*?aria-hidden="true"/);
  assert.match(headerSearch, /\[-webkit-tap-highlight-color:transparent\]/);
  assert.match(
    headerSearch,
    /focus-visible:ring-2 focus-visible:ring-\[#004BB8\]\/25/,
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

test("the unified launcher presents selected location, dates, and edit as separate compact fields", () => {
  assert.match(headerSearch, /h-11 w-full min-w-0/);
  assert.match(headerSearch, /data-cars-results-mobile-search-fields/);
  assert.match(headerSearch, /grid h-9 w-full min-w-0/);
  assert.match(headerSearch, /gap-\[3px\]/);
  assert.match(headerSearch, /data-cars-results-mobile-search-location/);
  assert.match(headerSearch, /data-cars-results-mobile-search-dates/);
  assert.match(headerSearch, /data-cars-results-mobile-search-edit/);
  assert.match(headerSearch, /<CalendarDays/);
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-divider/);
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-segments/);
  assert.equal(
    (headerSearch.match(/rounded-\[8px\] border border-\[#D5DFEA\] bg-\[#FBFCFE\]/g) ?? []).length,
    3,
  );
  assert.match(headerSearch, /text-\[11\.5px\] font-semibold/);
  assert.match(headerSearch, /text-\[10\.75px\] font-semibold/);
  assert.match(headerSearch, /text-\[#172238\]/);
  assert.match(headerSearch, /text-\[#536786\]/);
  assert.doesNotMatch(headerSearch, /flex-col|text-\[9\.5px\]/);
  assert.doesNotMatch(headerSearch, /min-h-\[62px\]|max-w-\[30rem\]|translate-y-1\/2/);

  const editForm = source.slice(
    source.indexOf('appearance="carsResultsEdit"'),
    source.indexOf("</MobileResultsEditSheet>"),
  );
  assert.match(editForm, /renderCarsSearchForm\("mobile"\)/);
});
