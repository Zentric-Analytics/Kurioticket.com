import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const card = readFileSync(
  new URL("./HotelCard.tsx", import.meta.url),
  "utf8",
);
const detailsClient = readFileSync(
  new URL("./HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);
const details = readFileSync(
  new URL("./hotelDetails/StandaloneHotelDetails.tsx", import.meta.url),
  "utf8",
);
const detailsNav = readFileSync(
  new URL("./hotelDetails/HotelDetailsSectionNav.tsx", import.meta.url),
  "utf8",
);

test("mobile-web Hotel results keep a readable foundation scale without browser zoom tricks", () => {
  assert.match(results, /data-mobile-web-hotel-results/);
  assert.match(
    results,
    /block truncate text-\[15px\] font-bold leading-5 text-slate-950/,
  );
  assert.match(
    results,
    /inline-flex max-w-full items-center gap-1\.5 text-\[13px\] font-medium leading-\[18px\] text-slate-600/,
  );
  assert.doesNotMatch(results, /\bzoom\s*:/);
});

test("mobile-web Hotel cards no longer compress supporting content to 10px", () => {
  assert.doesNotMatch(card, /text-\[10px\]/);
  assert.match(
    card,
    /text-\[12px\] font-normal leading-\[18px\] text-slate-600 md:text-\[13px\] md:leading-5/,
  );
  assert.match(
    card,
    /grid grid-cols-1 gap-y-1 text-\[12px\] leading-\[18px\][\s\S]*?md:text-xs md:leading-4/,
  );
  assert.match(
    card,
    /text-\[12px\] font-medium leading-\[18px\] text-emerald-700 md:mt-2 md:text-\[13px\] md:leading-5/,
  );
  assert.match(card, /text-\[15px\] font-bold leading-5[\s\S]*?lg:text-\[17px\]/);
});

test("mobile-web Hotel details use a phone-readable identity scale while desktop stays unchanged", () => {
  assert.match(details, /data-mobile-web-hotel-details/);
  assert.match(
    details,
    /text-\[24px\] font-extrabold leading-\[30px\][\s\S]*?lg:text-\[30px\] lg:leading-tight/,
  );
  assert.equal(
    details.match(/text-\[13px\] font-semibold leading-5 text-slate-700/g)?.length,
    3,
  );
  assert.match(
    details,
    /text-\[12px\] font-semibold leading-4 text-slate-600/,
  );
  assert.match(
    details,
    /text-\[12px\] leading-4 text-slate-600/,
  );
  assert.match(
    details,
    /min-h-12 w-full rounded-lg bg-blue px-3 text-\[13px\] font-bold leading-\[18px\]/,
  );
});

test("mobile-web Hotel details navigation remains web-native but legible", () => {
  assert.match(
    detailsClient,
    /hidden lg:block lg:px-0[\s\S]*?min-h-10 items-center gap-2 text-\[13px\] font-semibold/,
  );
  assert.match(
    detailsNav,
    /grid-cols-4[\s\S]*?min-h-11[\s\S]*?text-\[13px\] font-bold[\s\S]*?sm:text-sm/,
  );
  assert.match(detailsNav, /mobileLabel: "Rates"/);
  assert.doesNotMatch(detailsNav, /min-\[390px\]:text-\[13px\]/);
});
