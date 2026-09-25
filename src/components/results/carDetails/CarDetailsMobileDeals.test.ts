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


test("mobile web KAYAK Compare deals mirrors native provider-owned identity", () => {
  assert.match(
    details,
    /const providerValue = \(value\?: string\) =>[\s\S]*?Supplier not supplied[\s\S]*?KAYAK sandbox/,
  );
  assert.match(
    details,
    /providerValue\(offer\.bookingProviderName\)[\s\S]*?providerValue\(offer\.rentalCompanyName\)[\s\S]*?providerValue\(car\.rentalCompanyName\)/,
  );
  assert.match(
    details,
    /car\.sandboxPresentation \? \([\s\S]*?\{sandboxProvider\}[\s\S]*?\) : \([\s\S]*?kurioticket-logo-primary-light-bg\.svg/,
  );
  assert.match(
    details,
    /sandboxSupplier \? \([\s\S]*?<CarFront[\s\S]*?\{sandboxSupplier\}/,
  );
  assert.doesNotMatch(
    details.slice(
      details.indexOf('className="mt-5 space-y-2.5 lg:hidden"'),
      details.indexOf("{selectedOffer ? ("),
    ),
    />KAYAK sandbox<|>Simulated inventory — no real booking</,
  );
});

test("mobile web KAYAK dock opens the selected sandbox deal in a secure new tab", () => {
  const dock = details.slice(details.indexOf("function MobileBookingDock"));
  assert.match(
    details,
    /primaryAction\.kind === "sandbox-handoff"[\s\S]*?sandboxBookingUrl\(primaryOffer\?\.bookingUrl\)/,
  );
  assert.match(details, /action=\{effectivePrimaryAction\}/);
  assert.match(dock, /action\.kind === "sandbox-handoff"/);
  assert.match(dock, /data-mobile-car-dock-action/);
  assert.match(dock, /min-w-\[140px\] max-w-\[180px\] flex-\[0\.78\]/);
  const sandboxMobile = dock.slice(
    dock.indexOf('action.kind === "sandbox-handoff"'),
    dock.indexOf('action.kind === "standalone-disabled-provider"'),
  );
  assert.match(sandboxMobile, /<a[\s\S]*?href=\{action\.href\}/);
  assert.match(sandboxMobile, /target="_blank"/);
  assert.match(sandboxMobile, /rel="noopener noreferrer"/);
  assert.match(sandboxMobile, /referrerPolicy="no-referrer"/);
  assert.match(sandboxMobile, /copy\("carDetails\.continueDeal"\)/);
  assert.doesNotMatch(sandboxMobile, /<button[\s\S]*?disabled/);
});
