import test from "node:test";
import assert from "node:assert/strict";

import { getTranslations } from "@/lib/i18n";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { supportedLocales } from "@/lib/supportedLocales";

const destinationRuntimeKeys = [
  "destinationsHeroBadge",
  "destinationsHeroTitle",
  "destinationsHeroSubtitle",
  "destinationsRegionsAriaLabel",
  "destinationsCardAriaLabel",
  "destinationsImageAltSuffix",
  "destinations.card.subtitle",
  "destinations.region.europe",
  "destinations.region.northAmerica",
  "destinations.region.asia",
  "destinations.region.africa",
  "destinations.region.middleEast",
  "destinations.region.europe.summary",
  "destinations.region.northAmerica.summary",
  "destinations.region.asia.summary",
  "destinations.region.africa.summary",
  "destinations.region.middleEast.summary",
  "destinations.tag.iconicSkyline",
  "destinations.tag.landmarkEscape",
  "destinations.tag.cultureCapital",
  "destinations.tag.goldenHourViews",
  "destinations.tag.coastalEnergy",
  "destinations.tag.foodMarketNights",
  "destinations.tag.historicStreets",
  "destinations.tag.designWeekend",
  "destinations.city.london",
  "destinations.city.paris",
  "destinations.city.rome",
  "destinations.city.barcelona",
  "destinations.city.amsterdam",
  "destinations.city.lisbon",
  "destinations.city.prague",
  "destinations.city.athens",
  "destinations.city.venice",
  "destinations.city.florence",
  "destinations.city.berlin",
  "destinations.city.madrid",
  "destinations.city.copenhagen",
  "destinations.city.zurich",
  "destinations.city.vienna",
  "destinations.city.milan",
  "destinations.city.newYork",
  "destinations.city.lasVegas",
  "destinations.city.toronto",
  "destinations.city.losAngeles",
  "destinations.city.miami",
  "destinations.city.vancouver",
  "destinations.city.chicago",
  "destinations.city.sanFrancisco",
  "destinations.city.tokyo",
  "destinations.city.singapore",
  "destinations.city.bangkok",
  "destinations.city.kualaLumpur",
  "destinations.city.seoul",
  "destinations.city.osaka",
  "destinations.city.bali",
  "destinations.city.phuket",
  "destinations.city.capeTown",
  "destinations.city.marrakech",
  "destinations.city.nairobi",
  "destinations.city.accra",
  "destinations.city.lagos",
  "destinations.city.abuja",
  "destinations.city.dubai",
  "destinations.city.istanbul",
  "destinations.city.doha",
  "destinations.city.abuDhabi",
  "destinations.city.muscat",
  "destinations.city.jeddah",
  "destinations.country.unitedKingdom",
  "destinations.country.france",
  "destinations.country.italy",
  "destinations.country.spain",
  "destinations.country.netherlands",
  "destinations.country.portugal",
  "destinations.country.czechia",
  "destinations.country.greece",
  "destinations.country.germany",
  "destinations.country.denmark",
  "destinations.country.switzerland",
  "destinations.country.austria",
  "destinations.country.unitedStates",
  "destinations.country.canada",
  "destinations.country.japan",
  "destinations.country.singapore",
  "destinations.country.thailand",
  "destinations.country.malaysia",
  "destinations.country.southKorea",
  "destinations.country.indonesia",
  "destinations.country.southAfrica",
  "destinations.country.morocco",
  "destinations.country.kenya",
  "destinations.country.ghana",
  "destinations.country.nigeria",
  "destinations.country.unitedArabEmirates",
  "destinations.country.turkey",
  "destinations.country.qatar",
  "destinations.country.oman",
  "destinations.country.saudiArabia",
] as const;

function resolveTranslationValue(dictionary: TranslationDictionary, key: string, localeCode: string): string {
  assert.ok(key in dictionary, `${localeCode} is missing /destinations i18n key: ${key}`);
  const value = dictionary[key as keyof TranslationDictionary];
  assert.equal(typeof value, "string", `${localeCode} /destinations i18n key ${key} must resolve to a string`);
  assert.ok(value.trim().length > 0, `${localeCode} /destinations i18n key ${key} must not be empty`);
  return value;
}

test("active locales cover /destinations runtime i18n keys", () => {
  const activeLocales = supportedLocales.filter((locale) => locale.status === "available");

  assert.ok(activeLocales.length > 0, "expected at least one active locale for destinations i18n coverage");

  for (const locale of activeLocales) {
    const dictionary = getTranslations(locale.code);

    for (const key of destinationRuntimeKeys) {
      resolveTranslationValue(dictionary, key, locale.code);
    }

    const cardAriaLabel = resolveTranslationValue(dictionary, "destinationsCardAriaLabel", locale.code);
    assert.ok(
      cardAriaLabel.includes("{destination}"),
      `${locale.code} destinationsCardAriaLabel must include the {destination} placeholder`,
    );
  }
});
