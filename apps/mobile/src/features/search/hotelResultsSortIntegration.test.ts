import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("native Hotel sort owns local state and resets only for a new Hotel search", () => {
  assert.match(source, /const \[hotelSort, setHotelSort\] = useState<HotelSortMode>\(defaultHotelSort\)/);
  const resetEffect = source.slice(source.indexOf("if (flightResults || !plan.plan?.key) return"), source.indexOf("useFocusEffect", source.indexOf("if (flightResults || !plan.plan?.key) return")));
  assert.match(resetEffect, /previousHotelSearchKey\.current !== plan\.plan\.key[\s\S]*setHotelSort\(defaultHotelSort\)/);
});

test("filtered Hotel results use selected sort without provider refresh", () => {
  const derivation = source.slice(source.indexOf("const sorted = useMemo"), source.indexOf("const flightHighlights"));
  assert.match(derivation, /sortHotelsForResults\([\s\S]*hotelSort,[\s\S]*currencyState\?\.rates/);
  assert.doesNotMatch(derivation, /defaultHotelSort|travelApi|load\(/);
  assert.match(derivation, /hotelSort/);
});

test("changed Sort Apply updates ordering state and resets pagination through the results transition", () => {
  const sheet = source.slice(source.indexOf("<HotelResultsQuickFilterSheet"), source.indexOf("/> : null", source.indexOf("<HotelResultsQuickFilterSheet")));
  assert.match(sheet, /sort=\{hotelSort\}/);
  assert.match(sheet, /onSortChange=\{\(next\) => \{ if\(next===hotelSort\)return;setHotelSort\(next\);startHotelResultsTransition\(\); \}\}/);
  assert.doesNotMatch(sheet, /setHotelPage|setHotelFilters|travelApi|retry|setResults/);
  const transition = source.slice(source.indexOf("const startHotelResultsTransition"), source.indexOf("const transitionHotelFilters"));
  assert.match(transition, /setHotelPage\(1\)/);
});
