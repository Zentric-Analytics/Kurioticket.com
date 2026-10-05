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
    /focus-visible:ring-2 focus-visible:ring-\[#004BB8\]\/30/,
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

test("the unified launcher stays compact without changing the full Edit Search form", () => {
  assert.match(headerSearch, /h-11 w-full min-w-0/);
  assert.match(headerSearch, /flex h-9 w-full min-w-0 items-center/);
  assert.match(headerSearch, /rounded-\[9px\] border border-\[#D8E1EC\]/);
  assert.match(headerSearch, /text-\[12px\] font-semibold/);
  assert.match(headerSearch, /text-\[10\.5px\] font-medium/);
  assert.doesNotMatch(headerSearch, /flex-col|text-\[9\.5px\]/);
  assert.doesNotMatch(headerSearch, /min-h-\[62px\]|max-w-\[30rem\]|translate-y-1\/2/);

  const editForm = source.slice(
    source.indexOf('appearance="carsResultsEdit"'),
    source.indexOf("</MobileResultsEditSheet>"),
  );
  assert.match(editForm, /renderCarsSearchForm\("mobile"\)/);
});
