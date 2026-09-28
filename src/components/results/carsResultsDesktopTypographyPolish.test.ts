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
    /const fieldLabelClass =[\s\S]*?lg:text-\[10px\] lg:font-semibold lg:leading-\[14px\] lg:tracking-\[0\.10em\] lg:text-\[#536B92\]/,
  );
  assert.match(
    results,
    /const fieldInputClass =[\s\S]*?lg:text-\[14px\] lg:font-medium lg:leading-5 lg:tracking-\[-0\.005em\] lg:text-\[#142033\]/,
  );
  assert.match(
    results,
    /title=\{summary\}[\s\S]*?text-\[14px\] font-medium leading-5 tracking-\[-0\.005em\] text-\[#142033\]/,
  );
  assert.match(
    results,
    /id="sticky-cars-search-title"[\s\S]*?text-\[20px\] font-bold leading-6 tracking-\[-0\.015em\] text-\[#07133B\]/,
  );
  assert.match(
    results,
    /rentalDateSummary\} · \{timeSummary\} · \{driverAgeSummary\}[\s\S]*?text-\[13px\] font-medium leading-5 text-\[#536B92\]|text-\[13px\] font-medium leading-5 text-\[#536B92\][\s\S]*?rentalDateSummary\} · \{timeSummary\} · \{driverAgeSummary\}/,
  );
});

test("desktop filter, result-count, and sort typography share a consistent hierarchy", () => {
  assert.match(
    results,
    /truncate text-\[16px\] font-bold leading-5 tracking-\[-0\.01em\] text-\[#07133B\][\s\S]*?carsResults\.filterBy/,
  );
  assert.match(
    results,
    /<h3 className="text-\[12px\] font-bold uppercase leading-4 tracking-\[0\.11em\] text-\[#142033\]">/,
  );
  assert.match(
    results,
    /flex cursor-pointer items-center gap-2\.5 rounded-lg px-1\.5 py-1\.5 text-\[13px\] font-medium leading-5 transition-all/,
  );
  assert.match(
    results,
    /data-cars-results-summary-row[\s\S]*?lg:text-\[18px\] lg:leading-6 lg:tracking-\[-0\.01em\]/,
  );
  assert.match(
    results,
    /carsResults\.sortBy[\s\S]*?lg:text-\[13px\] lg:leading-5/,
  );
  assert.match(
    results,
    /ref=\{carsSortButtonRef\}[\s\S]*?lg:text-\[15px\] lg:leading-5 lg:tracking-\[-0\.005em\]/,
  );
});

test("standalone desktop result cards use a polished identity, details, and price hierarchy", () => {
  const standalone = card.slice(
    card.indexOf("data-car-card-desktop-shared-header"),
    card.indexOf('data-region="pricing"'),
  );

  assert.match(
    standalone,
    /text-\[19px\] font-bold leading-\[24px\] tracking-\[-0\.015em\] text-\[#07133B\]/,
  );
  assert.match(
    standalone,
    /text-\[12px\] font-medium leading-4 text-\[#536B92\][\s\S]*?or similar/,
  );
  assert.match(
    standalone,
    /text-\[10px\] font-bold uppercase leading-\[14px\] tracking-\[0\.12em\] text-\[#004BB8\]/,
  );
  assert.match(
    standalone,
    /text-\[12\.5px\] font-medium leading-\[18px\] text-\[#536B92\]/,
  );
  assert.match(
    standalone,
    /text-\[12\.5px\] font-semibold leading-\[18px\] text-\[#142033\]/,
  );
  assert.match(
    standalone,
    /grid-cols-2 lg:text-\[12\.5px\] lg:leading-\[17px\]/,
  );

  assert.match(
    price,
    /data-car-price-comparison-summary[\s\S]*?text-\[20px\] font-bold leading-\[23px\] tracking-\[-0\.015em\] text-\[#07133B\]/,
  );
  assert.match(
    price,
    /mt-1 text-\[11\.5px\] font-medium leading-\[14px\] text-\[#536B92\]/,
  );
  assert.match(
    price,
    /data-car-price-comparison-action[\s\S]*?text-\[14px\] font-semibold leading-5 tracking-\[-0\.005em\] text-\[#004BB8\]/,
  );
  assert.match(
    alert,
    /lg:text-\[14px\] lg:font-semibold lg:leading-5 lg:tracking-\[-0\.005em\] lg:text-\[#142033\]/,
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
