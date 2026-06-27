import assert from "node:assert/strict";
import test from "node:test";

import {
  activeHotelDestinationDisplayLocales,
  getHotelDestinationLocalizationCoverage,
  getLocalizedHotelDestinationCityName,
  getLocalizedHotelDestinationCountryName,
  getLocalizedHotelDestinationDetail,
  hotelDestinations,
  normalizeHotelDestinationDisplayLocale,
  searchHotelDestinations,
} from "@/data/hotelDestinations";
import { translations as trTranslations } from "@/lib/i18n/tr";

const byId = (id: string) => {
  const destination = hotelDestinations.find((item) => item.id === id);
  assert.ok(destination, `Missing hotel destination fixture ${id}`);
  return destination;
};

test("Turkish hotel destination picker display labels localize while preserving raw values", () => {
  const london = byId("gb-london");
  const rome = byId("it-rome");
  const lagos = byId("ng-lagos");
  const portHarcourt = byId("ng-port-harcourt");
  const paris = byId("fr-paris");

  assert.equal(trTranslations.hotelSearchDestinationLabel, "VARIŞ");
  assert.equal(trTranslations["hotelDestinationKind.city"], "Şehir");
  assert.equal(getLocalizedHotelDestinationCityName(london.name, "tr"), "Londra");
  assert.equal(getLocalizedHotelDestinationDetail(london, "tr"), "İngiltere, Birleşik Krallık");
  assert.equal(getLocalizedHotelDestinationCityName(rome.name, "tr"), "Roma");
  assert.equal(getLocalizedHotelDestinationDetail(rome, "tr"), "Lazio, İtalya");
  assert.equal(getLocalizedHotelDestinationCountryName(lagos, "tr"), "Nijerya");
  assert.equal(getLocalizedHotelDestinationCityName(lagos.name, "tr"), "Lagos");
  assert.equal(getLocalizedHotelDestinationDetail(portHarcourt, "tr"), "Rivers, Nijerya");
  assert.equal(getLocalizedHotelDestinationDetail(paris, "tr"), "Île-de-France, Fransa");

  assert.equal(london.id, "gb-london");
  assert.equal(london.searchValue, "London, United Kingdom");
  assert.equal(rome.id, "it-rome");
  assert.equal(rome.searchValue, "Rome, Italy");
});

test("hotel destination locale normalization supports active variants", () => {
  const cases = [
    ["en", "en-us"], ["en-US", "en-us"], ["ar", "ar"], ["nl", "nl"],
    ["es", "es-es"], ["es-ES", "es-es"], ["fr", "fr"], ["de", "de-de"],
    ["de-DE", "de-de"], ["it", "it-it"], ["it-IT", "it-it"], ["pt", "pt-br"],
    ["pt-BR", "pt-br"], ["zh", "zh-cn"], ["zh-CN", "zh-cn"], ["ja", "ja"],
    ["ko", "ko"], ["hi", "hi"], ["hi-IN", "hi"], ["tr", "tr"], ["tr-TR", "tr"],
  ] as const;

  for (const [input, expected] of cases) {
    assert.equal(normalizeHotelDestinationDisplayLocale(input), expected);
  }
});

test("hotel destination city country and region display coverage is complete for active locales", () => {
  const report = getHotelDestinationLocalizationCoverage();

  assert.deepEqual(report.map((entry) => entry.locale), [...activeHotelDestinationDisplayLocales]);
  for (const localeReport of report) {
    assert.equal(localeReport.cities, 83);
    assert.equal(localeReport.regions, 37);
    assert.equal(localeReport.countries, 34);
    assert.deepEqual(localeReport.missingCities, []);
    assert.deepEqual(localeReport.missingRegions, []);
    assert.deepEqual(localeReport.missingCountries, []);
    assert.equal(localeReport.fallbackCount, 0);
  }
});

test("hotel destination display localization does not mutate search suggestions or payload values", () => {
  const before = JSON.stringify(hotelDestinations);
  const suggestions = searchHotelDestinations({ query: "London", countryCode: "GB", limit: 3 });
  const london = suggestions[0];

  assert.equal(london.id, "gb-london");
  assert.equal(london.name, "London");
  assert.equal(london.region, "England");
  assert.equal(london.country, "United Kingdom");
  assert.equal(london.searchValue, "London, United Kingdom");
  assert.equal(getLocalizedHotelDestinationCityName(london.name, "tr"), "Londra");
  assert.equal(getLocalizedHotelDestinationDetail(london, "tr"), "İngiltere, Birleşik Krallık");
  assert.equal(JSON.stringify(hotelDestinations), before);
});
