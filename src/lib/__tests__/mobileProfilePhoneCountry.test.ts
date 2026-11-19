import assert from "node:assert/strict";
import test from "node:test";
import {
  getExistingMobileProfilePhoneCountry,
  resolveMobileProfilePhoneCountry,
} from "@/lib/mobileProfilePhoneCountry";

test("saved phone country wins over detected location", () => {
  assert.equal(
    resolveMobileProfilePhoneCountry({
      savedCountryCode: "GB",
      phoneNumber: "",
      detectedCountryCode: "NG",
    }),
    "GB",
  );
});

test("unique international phone prefix wins when saved country is missing", () => {
  assert.equal(
    resolveMobileProfilePhoneCountry({
      savedCountryCode: "",
      phoneNumber: "+44 20 7946 0958",
      detectedCountryCode: "NG",
    }),
    "GB",
  );
});

test("shared international prefixes defer to detected location", () => {
  assert.equal(
    getExistingMobileProfilePhoneCountry({
      savedCountryCode: "",
      phoneNumber: "+1 212 555 0199",
    }),
    null,
  );
  assert.equal(
    resolveMobileProfilePhoneCountry({
      savedCountryCode: "",
      phoneNumber: "+12125550199",
      detectedCountryCode: "US",
    }),
    "US",
  );
  assert.equal(
    resolveMobileProfilePhoneCountry({
      savedCountryCode: "",
      phoneNumber: "+74951234567",
      detectedCountryCode: "RU",
    }),
    "RU",
  );
});

test("missing saved country and unrecognized local phone require location/default resolution", () => {
  assert.equal(
    getExistingMobileProfilePhoneCountry({
      savedCountryCode: "",
      phoneNumber: "0803 123 4567",
    }),
    null,
  );
});

test("detected location seeds an empty phone country", () => {
  assert.equal(
    resolveMobileProfilePhoneCountry({
      savedCountryCode: "",
      phoneNumber: "",
      detectedCountryCode: "US",
    }),
    "US",
  );
});

test("unsupported or unavailable location falls back safely", () => {
  assert.equal(
    resolveMobileProfilePhoneCountry({
      savedCountryCode: "",
      phoneNumber: "",
      detectedCountryCode: "ZZ",
    }),
    "NG",
  );
  assert.equal(
    resolveMobileProfilePhoneCountry({
      savedCountryCode: "",
      phoneNumber: "",
      detectedCountryCode: null,
    }),
    "NG",
  );
});
