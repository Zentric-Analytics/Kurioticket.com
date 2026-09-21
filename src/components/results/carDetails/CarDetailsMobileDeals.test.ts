import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const details = readFileSync(
  "src/components/results/CarDetailsClient.tsx",
  "utf8",
);

test("mobile web Compare deals mirrors the compact real-offer contract", () => {
  assert.match(details, /getComparisonCarOffers\(car\.offers\)/);
  assert.match(details, /role="radiogroup"/);
  assert.match(details, /role="radio"/);
  assert.match(details, /aria-checked=\{selected\}/);
  assert.match(details, /onClick=\{\(\) => onSelectOffer\(offer\.id\)\}/);
  assert.match(details, /width=\{108\}/);
  assert.match(details, /height=\{24\}/);
  assert.match(details, /size-4 shrink-0/);
  assert.match(details, /size-1\.5 rounded-full bg-\[#075EE8\]/);
  assert.match(details, /text-\[10\.5px\][^"]*leading-\[15px\]/);
  assert.match(details, /text-\[19px\][^"]*leading-\[22px\]/);
  assert.match(details, /space-y-2\.5/);
  assert.doesNotMatch(details, /Math\.random|pricePerDay\s*[+*\-]\s*\d/);
});

test("selected mobile deal drives the booking offer used by the dock", () => {
  assert.match(
    details,
    /comparisonOffers\.find\(\(candidate\) => candidate\.id === selectedOfferId\)[\s\S]*?canonicalPrimaryOffer/,
  );
  assert.match(details, /selectedOfferId=\{primaryOffer\.id\}/);
  assert.match(details, /onSelectOffer=\{setSelectedOfferId\}/);
  assert.match(
    details,
    /<MobileBookingDock[\s\S]*?offer=\{primaryOffer\}/,
  );
});
