import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAirportLabel,
  formatLocalizedAirportLabel,
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
});

test("formatLocalizedAirportLabel uses natural active-locale city names", () => {
  assert.equal(formatLocalizedAirportLabel({ city: "London", code: "LHR", locale: "nl" }), "Londen (LHR)");
  assert.equal(formatLocalizedAirportLabel({ city: "London", code: "LHR", locale: "es-es" }), "Londres (LHR)");
  assert.equal(formatLocalizedAirportLabel({ city: "Dubai", code: "DXB", locale: "fr" }), "Dubaï (DXB)");
  assert.equal(formatLocalizedAirportLabel({ city: "Los Angeles", code: "LAX", locale: "ko" }), "로스앤젤레스 (LAX)");
});

test("unknown city names fall back without changing the airport code", () => {
  assert.equal(getLocalizedCityName("Provider City", "ko"), "Provider City");
  assert.equal(formatLocalizedAirportLabel({ city: "Provider City", code: "ZZZ", locale: "ko" }), "Provider City (ZZZ)");
});
