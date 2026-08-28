import assert from "node:assert/strict";
import test from "node:test";
import { resolveMobileProfilePhoneCountry } from "@/lib/mobileProfilePhoneCountry";

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

test("recognized international phone prefix wins when saved country is missing", () => {
  assert.equal(
    resolveMobileProfilePhoneCountry({
      savedCountryCode: "",
      phoneNumber: "+44 20 7946 0958",
      detectedCountryCode: "NG",
    }),
    "GB",
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
