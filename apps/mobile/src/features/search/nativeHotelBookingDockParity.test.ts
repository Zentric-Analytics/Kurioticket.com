import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const ratesSource = readFileSync("src/features/search/NativeHotelRatesSection.tsx", "utf8");
const webMobileDetails = readFileSync(
  "../../src/components/results/hotelDetails/MobileHotelDetails.tsx",
  "utf8",
);
const webMobileCss = readFileSync(
  "../../src/components/results/hotelDetails/HotelDetailsMobile.module.css",
  "utf8",
);

function rateStyle(name: string, nextName?: string) {
  const start = ratesSource.indexOf(`  ${name}:`);
  const end = nextName
    ? ratesSource.indexOf(`  ${nextName}:`, start)
    : ratesSource.indexOf("\n});", start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName ?? "stylesheet end"} must follow ${name}`);
  return ratesSource.slice(start, end);
}

test("mobile web reference renders dedicated Hotel provider offers from shared offer data", () => {
  assert.match(webMobileDetails, /import \{ MobileProviderOffer \} from "\.\/HotelPriceComparisonSection"/);
  assert.match(webMobileDetails, /offers\.map\(offer => <MobileProviderOffer/);
  assert.match(webMobileDetails, /onInfo=\{anchor => \{ setRateAnchor\(anchor\); setRateInfo\(current =>/);
  assert.match(webMobileDetails, /perNightText=\{props\.perNightText\}/);
  assert.match(webMobileDetails, /totalPrice: total/);
  const rateListStart = webMobileDetails.indexOf('<div aria-label="Hotel rates" className={styles.rateList}>');
  assert.ok(rateListStart >= 0, "the provider-card list must be present");
  const rateListEnd = webMobileDetails.indexOf("</div>", rateListStart);
  assert.ok(rateListEnd > rateListStart);
  const providerCards = webMobileDetails.slice(rateListStart, rateListEnd);
  assert.match(providerCards, /offers\.map\(offer => <MobileProviderOffer/);
  assert.doesNotMatch(providerCards, />Stay total</, "the card list must not repeat the details-dialog total label");
  assert.match(webMobileDetails, /rateInfo && rateAnchor \? <HotelRatePopover offer=\{rateInfo\} anchor=\{rateAnchor\} onClose=\{\(\) => setRateInfo\(null\)\}/);
  assert.match(webMobileDetails, /import \{ HotelRatePopover \} from "\.\/HotelRatePopover"/);
  assert.doesNotMatch(webMobileDetails, /<HotelRateInfoPopover/);
  assert.doesNotMatch(webMobileDetails, /className=\{styles\.rateAction\}/);
  assert.doesNotMatch(webMobileCss, /\.rate\[data-selected="true"\][^}]*border-color: var\(--accent\)/);
});


test("native Hotel rate cards replace the bottom dock on all tabs", () => {
  assert.doesNotMatch(detailSource, /bookingDock|NativeSupplierInformation|Property information supplied by KAYAK/);
  assert.ok(detailSource.includes('contentContainerStyle={{ paddingBottom: 24 + inset.bottom }}'));
  assert.match(detailSource, /onViewDeal=\\{\\(rateId\\) => void continueHotelRate\\(rateId\\)\\}/);
  assert.match(detailSource, /travelApi\\.hotelRedirect\\(selected\\.offerId\\)/);
  assert.match(ratesSource, /onPress=\\{\\(\\) => onViewDeal\\(row\\.id\\)\\}/);
  assert.match(ratesSource, /hotelSupplierFacts\\(providerDetails\\)/);
  assert.match(ratesSource, /Bundled rate\\|Rate breakdown\\|Rate condition/);
});
