import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
const filters = readFileSync("src/features/search/CarFilterSheet.tsx", "utf8");
const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
const currencyHook = readFileSync("src/features/search/useCarDisplayCurrency.ts", "utf8");
const settings = readFileSync("src/features/flow/SettingsScreens.tsx", "utf8");
const searchModel = readFileSync("src/features/flow/travelSearchModel.ts", "utf8");

const carPlanStart = searchModel.indexOf("  const pickupLocation = text(params.pickupLocation)");
const carPlanEnd = searchModel.indexOf("\nexport function validFlight", carPlanStart);
const carPlan = searchModel.slice(carPlanStart, carPlanEnd);

test("native Cars consumes the canonical reactive app language instead of owning a Cars locale", () => {
  assert.match(results, /const \{ locale \} = useMobileLocalization\(\)/);
  assert.match(results, /carFilterCopy\(locale\)/);
  assert.match(results, /formatCarResultsScheduleSummary\(\{[^}]*locale\}\)/);
  assert.match(filters, /const \{ locale, direction \} = useMobileLocalization\(\)/);
  assert.doesNotMatch(results + filters, /AsyncStorage|kurioticket\.cars\.(?:locale|language)|readGuestLocale|writeGuestLocale/);
});

test("native Cars display pricing consumes canonical currency and the official selector writes through setCurrency", () => {
  assert.match(currencyHook, /const \{ currency \} = useMobileLocalization\(\)/);
  assert.match(card, /useCarDisplayCurrency\(\)/);
  assert.match(card, /presentCarOfferCurrency\(primaryOffer, displayCurrency, rates\)/);
  assert.match(settings, /currency: selected, setCurrency, t \} = useMobileLocalization\(\)/);
  assert.match(settings, /await setCurrency\(currency\)/);
  assert.doesNotMatch(card + currencyHook, /AsyncStorage|readCurrencyPreference|writeCurrency|kurioticket\.cars\.currency/);
});

test("language and currency presentation changes cannot restart or rewrite the canonical Cars search", () => {
  assert.ok(carPlanStart >= 0 && carPlanEnd > carPlanStart);
  assert.doesNotMatch(carPlan, /\blocale\b|\blanguage\b|\bcurrency\b/);
  assert.match(results, /travelApi\.searchCars\(plan\.plan\.payload,\{signal:controller\.signal,requestId\}\)/);
  assert.match(results, /\},\[plan\.plan\?\.key,retry\]\);/);
  assert.doesNotMatch(card + currencyHook, /searchCars\(|setFilters\(|setSort\(/);
});

test("currency propagation preserves the daily-price Car card commerce contract", () => {
  assert.match(card, /money\(offer\.currency, offer\.pricePerDay\)/);
  assert.match(card, />per day<\/Text>/);
  assert.doesNotMatch(card, /money\(offer\.currency, offer\.totalPrice\)/);
  assert.doesNotMatch(card, /offer\.taxesAndFeesIncluded|includes taxes & fees|taxes & fees shown where known/);
  assert.match(card, /useSavedCar\(result, searchParams\)/);
  assert.match(card, /onPress=\{onViewDeal\}/);
});
