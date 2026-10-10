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
const price = readFileSync(
  new URL("./CarPriceComparison.tsx", import.meta.url),
  "utf8",
);
const alert = readFileSync(
  new URL("./CarPriceAlertControl.tsx", import.meta.url),
  "utf8",
);

test("standalone desktop search surfaces use one restrained label and value hierarchy", () => {
  assert.match(
    results,
    /const fieldLabelClass =[\s\S]*?lg:mb-1 lg:text-\[12px\] lg:font-bold lg:uppercase lg:leading-4 lg:tracking-\[0\.05em\] lg:text-\[#475569\]/,
  );
  assert.match(
    results,
    /const desktopFullSelectedValueClass =\s*"cars-results-desktop-filter-heading-type"/,
  );
  assert.match(
    results,
    /title=\{summary\}[\s\S]*?text-\[15px\] font-semibold leading-5 tracking-\[-0\.005em\] text-\[#142033\]/,
  );
  assert.match(
    results,
    /id="sticky-cars-search-title"[\s\S]*?text-\[19px\] font-bold leading-6 tracking-\[-0\.012em\] text-\[#07133B\]/,
  );
  assert.match(
    results,
    /text-\[14px\] font-medium leading-5 text-\[#526174\][\s\S]*?rentalDateSummary\} · \{timeSummary\} · \{driverAgeSummary\}/,
  );
  assert.equal(
    (
      results.match(
        /isCompact \? desktopCompactSelectedValueClass : desktopFullSelectedValueClass/g,
      ) ?? []
    ).length,
    4,
    "pickup, rental dates, time, and driver age share the same desktop value hierarchy",
  );
  assert.match(
    results,
    /lg:placeholder:font-medium lg:placeholder:text-slate-400/,
  );
});

test("desktop filter, result-count, and sort typography share a consistent hierarchy", () => {
  assert.match(
    results,
    /truncate text-\[16px\] font-bold leading-6 tracking-\[-0\.006em\] text-\[#07133B\][\s\S]*?\{t\("filters"\)\}/,
  );
  assert.match(
    results,
    /<h3 className="cars-results-desktop-filter-heading-type text-\[15px\] font-bold normal-case leading-5 tracking-\[-0\.003em\] text-slate-950">/,
  );
  assert.match(
    results,
    /flex cursor-pointer items-center gap-2\.5 rounded-lg px-1\.5 py-1\.5 text-\[14px\] font-medium leading-5 transition-all/,
  );
  assert.match(
    results,
    /data-cars-results-summary-row[\s\S]*?text-\[12px\] font-semibold leading-4[\s\S]*?sm:text-\[14px\] sm:font-semibold sm:leading-5[\s\S]*?lg:text-\[14px\] lg:font-semibold lg:leading-5 lg:tracking-\[-0\.005em\]/,
  );
  assert.match(
    results,
    /cars-results-desktop-sort-label[\s\S]*?carsResults\.sortBy/,
  );
  assert.match(
    results,
    /ref=\{carsSortButtonRef\}[\s\S]*?cars-results-desktop-sort-trigger/,
  );
});

test("standalone desktop result cards use a polished identity, details, and price hierarchy", () => {
  const standalone = card.slice(
    card.indexOf("data-car-card-desktop-shared-header"),
    card.indexOf('data-region="pricing"'),
  );

  assert.match(
    standalone,
    /text-\[19px\] font-bold leading-\[24px\] tracking-\[-0\.012em\] text-\[#07133B\]/,
  );
  assert.match(
    standalone,
    /text-\[12px\] font-medium leading-4 tracking-\[-0\.001em\] text-\[#475569\][\s\S]*?or similar/,
  );
  assert.match(
    standalone,
    /text-\[10px\] font-bold uppercase leading-\[15px\] tracking-\[0\.1em\] text-\[#004BB8\]/,
  );
  assert.match(
    standalone,
    /<MapPin[\s\S]{0,100}?text-\[#07133B\]/,
  );
  assert.doesNotMatch(
    standalone,
    /<MapPin[\s\S]{0,100}?text-\[#004BB8\]/,
  );
  assert.match(
    standalone,
    /text-\[13px\] font-semibold leading-\[18px\] tracking-\[-0\.001em\] text-\[#334155\]/,
  );
  assert.match(
    standalone,
    /text-\[13px\] font-semibold leading-\[18px\] tracking-\[-0\.001em\] text-slate-950/,
  );
  assert.match(
    standalone,
    /grid-cols-2 lg:text-\[13px\] lg:font-semibold lg:leading-\[18px\]/,
  );

  assert.match(
    price,
    /data-car-price-comparison-summary[\s\S]*?text-\[21px\] font-bold leading-\[25px\] tracking-\[-0\.012em\] text-\[#07133B\]/,
  );
  assert.match(
    price,
    /mt-1 text-\[11\.5px\] font-medium leading-\[14px\] text-\[#536B92\]/,
  );
  assert.match(
    price,
    /data-car-price-comparison-action[\s\S]*?font-bold leading-5 text-\[#004BB8\][\s\S]*?text-\[14px\] tracking-\[-0\.005em\]/,
  );
  assert.match(
    alert,
    /lg:text-\[14px\] lg:font-bold lg:leading-5 lg:tracking-\[-0\.002em\] lg:text-slate-950/,
  );
});

test("desktop typography polish leaves the established mobile Cars hierarchy intact", () => {
  assert.match(
    results,
    /carsMobileEditPickupValueClass =[\s\S]*?text-\[15px\] font-semibold leading-5 text-\[#1A1A1A\]/,
  );
  assert.match(
    results,
    /carsMobileEditSecondaryValueClass =[\s\S]*?text-\[12px\] font-normal leading-4 tracking-normal text-\[#595959\]/,
  );

  const mobileCard = card.slice(
    card.indexOf("data-car-card-mobile-main"),
    card.indexOf('data-region="heading"'),
  );
  assert.match(
    mobileCard,
    /text-\[15px\] font-bold leading-\[18px\]/,
  );
  assert.match(
    mobileCard,
    /data-car-card-mobile-specs[\s\S]*?text-\[11px\] font-medium leading-\[14px\]/,
  );
  assert.match(
    mobileCard,
    /text-\[19px\] font-semibold leading-\[22px\] tracking-\[-0\.02em\] text-\[#07133B\]/,
  );
  assert.doesNotMatch(mobileCard, /text-\[20px\]/);
});
