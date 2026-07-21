import assert from "node:assert/strict";
import test from "node:test";

import {
  airports,
  formatAirportLabel,
  getAirportCityLocalizationCoverage,
  getAirportCountryLocalizationCoverage,
  formatLocalizedAirportLabel,
  getLocalizedAirportCountryName,
  getLocalizedCityName,
  type AirportOption,
} from "@/data/airports";

const lagos: AirportOption = {
  code: "LOS",
  city: "Lagos",
  airport: "Murtala Muhammed International Airport",
};

test("formatAirportLabel localizes known city display names and preserves codes", () => {
  assert.equal(formatAirportLabel(lagos, "ko"), "라고스 (LOS)");
  assert.equal(formatAirportLabel(lagos, "ja"), "ラゴス (LOS)");
  assert.equal(formatAirportLabel(lagos, "zh-cn"), "拉各斯 (LOS)");
  assert.equal(formatAirportLabel(lagos, "ar"), "لاغوس (LOS)");
  assert.equal(formatAirportLabel(lagos, "hi"), "लागोस (LOS)");
});

test("formatLocalizedAirportLabel uses natural active-locale city names", () => {
  assert.equal(formatLocalizedAirportLabel({ city: "London", code: "LHR", locale: "nl" }), "Londen (LHR)");
  assert.equal(formatLocalizedAirportLabel({ city: "London", code: "LHR", locale: "es-es" }), "Londres (LHR)");
  assert.equal(formatLocalizedAirportLabel({ city: "Dubai", code: "DXB", locale: "fr" }), "Dubaï (DXB)");
  assert.equal(formatLocalizedAirportLabel({ city: "Los Angeles", code: "LAX", locale: "ko" }), "로스앤젤레스 (LAX)");
  assert.equal(formatLocalizedAirportLabel({ city: "Dubai", code: "DXB", locale: "hi" }), "दुबई (DXB)");
  assert.equal(formatLocalizedAirportLabel({ city: "London", code: "LHR", locale: "tr" }), "Londra (LHR)");
  assert.equal(formatLocalizedAirportLabel({ city: "Istanbul", code: "IST", locale: "tr" }), "İstanbul (IST)");
});

test("L airport city labels localize across core Asian and Arabic locales while preserving codes", () => {
  const koreanCases = [
    ["Los Angeles", "LAX", "로스앤젤레스 (LAX)"],
    ["Las Vegas", "LAS", "라스베이거스 (LAS)"],
    ["Luanda", "LAD", "루안다 (LAD)"],
    ["Lansing", "LAN", "랜싱 (LAN)"],
    ["Lawton", "LAW", "로턴 (LAW)"],
    ["La Paz", "LAP", "라파스 (LAP)"],
    ["Lae", "LAE", "라에 (LAE)"],
  ] as const;

  for (const [city, code, expected] of koreanCases) {
    assert.equal(formatLocalizedAirportLabel({ city, code, locale: "ko" }), expected);
    assert.equal(formatLocalizedAirportLabel({ city, code, locale: "tr" }).endsWith(`(${code})`), true);
    assert.equal(code, code.toUpperCase());
  }

  assert.equal(formatLocalizedAirportLabel({ city: "Los Angeles", code: "LAX", locale: "ja" }), "ロサンゼルス (LAX)");
  assert.equal(formatLocalizedAirportLabel({ city: "Las Vegas", code: "LAS", locale: "ja" }), "ラスベガス (LAS)");
  assert.equal(formatLocalizedAirportLabel({ city: "Luanda", code: "LAD", locale: "ja" }), "ルアンダ (LAD)");
  assert.equal(formatLocalizedAirportLabel({ city: "Los Angeles", code: "LAX", locale: "zh-cn" }), "洛杉矶 (LAX)");
  assert.equal(formatLocalizedAirportLabel({ city: "Las Vegas", code: "LAS", locale: "zh-cn" }), "拉斯维加斯 (LAS)");
  assert.equal(formatLocalizedAirportLabel({ city: "Luanda", code: "LAD", locale: "zh-cn" }), "罗安达 (LAD)");
  assert.equal(formatLocalizedAirportLabel({ city: "Los Angeles", code: "LAX", locale: "ar" }), "لوس أنجلوس (LAX)");
  assert.equal(formatLocalizedAirportLabel({ city: "Las Vegas", code: "LAS", locale: "ar" }), "لاس فيغاس (LAS)");
  assert.equal(formatLocalizedAirportLabel({ city: "Luanda", code: "LAD", locale: "ar" }), "لواندا (LAD)");
});

test("European locale city labels cover common differing names", () => {
  assert.equal(formatLocalizedAirportLabel({ city: "London", code: "LHR", locale: "nl" }), "Londen (LHR)");
  assert.equal(formatLocalizedAirportLabel({ city: "Rome", code: "FCO", locale: "de-de" }), "Rom (FCO)");
  assert.equal(formatLocalizedAirportLabel({ city: "Barcelona", code: "BCN", locale: "fr" }), "Barcelone (BCN)");
  assert.equal(formatLocalizedAirportLabel({ city: "Los Angeles", code: "LAX", locale: "es-es" }), "Los Ángeles (LAX)");
});

test("airport city localization coverage is complete for every active locale", () => {
  const report = getAirportCityLocalizationCoverage();
  const uniqueCities = new Set(airports.map((airport) => airport.city));

  assert.equal(uniqueCities.size, 234);
  assert.equal(report.length, 13);
  for (const localeReport of report) {
    assert.equal(localeReport.total, uniqueCities.size);
    assert.equal(localeReport.localized, uniqueCities.size);
    assert.equal(localeReport.fallback, 0);
    assert.deepEqual(localeReport.missing, []);
  }
});

test("Turkish airport city and country display labels localize without changing codes", () => {
  const turkishCases = [
    ["Lagos", "LOS", "Lagos (LOS)"],
    ["Los Angeles", "LAX", "Los Angeles (LAX)"],
    ["London", "LHR", "Londra (LHR)"],
    ["Istanbul", "IST", "İstanbul (IST)"],
    ["Rome", "FCO", "Roma (FCO)"],
    ["Accra", "ACC", "Akra (ACC)"],
    ["Cairo", "CAI", "Kahire (CAI)"],
    ["Lisbon", "LIS", "Lizbon (LIS)"],
    ["Barcelona", "BCN", "Barselona (BCN)"],
    ["Singapore", "SIN", "Singapur (SIN)"],
  ] as const;

  for (const [city, code, expected] of turkishCases) {
    assert.equal(formatLocalizedAirportLabel({ city, code, locale: "tr" }), expected);
    assert.equal(code, code.toUpperCase());
  }

  assert.equal(getLocalizedAirportCountryName({ country: "Nigeria", countryCode: "NG" }, "tr"), "Nijerya");
  assert.equal(getLocalizedAirportCountryName({ country: "United States", countryCode: "US" }, "tr"), "Amerika Birleşik Devletleri");
});

test("Hindi airport city and country display labels localize without changing codes", () => {
  const hindiCases = [
    ["Lagos", "LOS", "लागोस (LOS)"],
    ["Kano", "KAN", "कानो (KAN)"],
    ["Los Angeles", "LAX", "लॉस एंजेलिस (LAX)"],
    ["Las Vegas", "LAS", "लास वेगास (LAS)"],
    ["Dubai", "DXB", "दुबई (DXB)"],
    ["London", "LHR", "लंदन (LHR)"],
    ["Paris", "CDG", "पेरिस (CDG)"],
    ["Istanbul", "IST", "इस्तांबुल (IST)"],
    ["Johannesburg", "JNB", "जोहान्सबर्ग (JNB)"],
    ["Accra", "ACC", "अक्रा (ACC)"],
  ] as const;

  for (const [city, code, expected] of hindiCases) {
    assert.equal(formatLocalizedAirportLabel({ city, code, locale: "hi" }), expected);
    assert.equal(code, code.toUpperCase());
  }

  assert.equal(getLocalizedAirportCountryName({ country: "Nigeria", countryCode: "NG" }, "hi"), "नाइजीरिया");
});

test("airport country localization coverage is complete for every active locale", () => {
  const report = getAirportCountryLocalizationCoverage();
  const uniqueCountryCodes = new Set(airports.map((airport) => airport.countryCode).filter(Boolean));

  assert.equal(report.length, 13);
  for (const localeReport of report) {
    assert.equal(localeReport.total, uniqueCountryCodes.size);
    assert.equal(localeReport.localized, uniqueCountryCodes.size);
    assert.equal(localeReport.fallback, 0);
    assert.deepEqual(localeReport.missing, []);
  }
});

test("localized airport labels preserve airport codes for every airport and active locale", () => {
  const report = getAirportCityLocalizationCoverage();

  for (const localeReport of report) {
    for (const airport of airports) {
      const label = formatAirportLabel(airport, localeReport.locale);
      assert.match(label, new RegExp(`\\(${airport.code}\\)$`));
      assert.equal(airport.code, airport.code.toUpperCase());
    }
  }
});


test("unknown city names fall back without changing the airport code", () => {
  assert.equal(getLocalizedCityName("Provider City", "ko"), "Provider City");
  assert.equal(getLocalizedCityName("Provider City", "tr"), "Provider City");
  assert.equal(formatLocalizedAirportLabel({ city: "Provider City", code: "ZZZ", locale: "ko" }), "Provider City (ZZZ)");
  assert.equal(formatLocalizedAirportLabel({ city: "Provider City", code: "ZZZ", locale: "tr" }), "Provider City (ZZZ)");
});
