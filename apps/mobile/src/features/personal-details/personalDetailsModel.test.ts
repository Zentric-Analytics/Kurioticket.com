import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalDate,
  COUNTRY_OPTIONS,
  GENDER_VALUES,
  getCountryFlagUri,
  NATIONALITY_OPTIONS,
  PHONE_COUNTRY_OPTIONS,
  normalizeProfile,
  parseAddress,
  PERSONAL_DETAIL_ORDER,
  profilesDiffer,
  serializeAddress,
  serializePhone,
  STRUCTURED_ADDRESS_PREFIX,
} from "./personalDetailsModel";
import { personalDetailsCopy } from "./translations";
test("read-only fields have the required exact order", () =>
  assert.deepEqual(PERSONAL_DETAIL_ORDER, [
    "fullName",
    "email",
    "phoneNumber",
    "dateOfBirth",
    "gender",
    "nationality",
    "address",
  ]));
test("unchanged normalized profiles are not dirty and real edits are", () => {
  const saved = normalizeProfile({ fullName: "Ada" });
  assert.equal(profilesDiffer(saved, { ...saved }), false);
  assert.equal(profilesDiffer(saved, { ...saved, fullName: "Grace" }), true);
});
test("phone country and local number serialize with canonical catalogue", () => {
  const result = serializePhone("US", "+1 (212) 555-0199");
  assert.equal(result.phoneCountryCode, "US");
  assert.match(result.phoneNumber, /212/);
  assert.ok(COUNTRY_OPTIONS.some((x) => x.code === "US"));
});
test("date selection emits canonical dates and rejects impossible or future dates", () => {
  assert.equal(canonicalDate("2000", "2", "29"), "2000-02-29");
  assert.equal(canonicalDate("2023", "2", "29"), null);
  assert.equal(canonicalDate("2999", "1", "1"), null);
});
test("gender and nationality use canonical supported options", () => {
  assert.deepEqual(GENDER_VALUES, [
    "Male",
    "Female",
    "I prefer not to say",
  ]);
  assert.ok(NATIONALITY_OPTIONS.includes("United States"));
});
test("structured addresses round trip and legacy values remain readable", () => {
  const legacy = "1 Main St\nLagos\nNigeria";
  assert.equal(parseAddress(legacy).addressLine1, "1 Main St");
  const encoded = serializeAddress({
    ...parseAddress(""),
    countryCode: "NG",
    addressLine1: "1 Main St",
  });
  assert.ok(encoded.startsWith(STRUCTURED_ADDRESS_PREFIX));
  assert.equal(parseAddress(encoded).addressLine1, "1 Main St");
});
test("English and Spanish Personal details labels and fallbacks exist", () => {
  for (const locale of ["en-us", "es-es"] as const) {
    const copy = personalDetailsCopy(locale);
    assert.ok(
      copy.title &&
        copy.missing &&
        copy.save &&
        copy.discardTitle &&
        copy.externalHint,
    );
  }
});

test("validated ISO country resolves a FlagCDN PNG and invalid values cannot form URLs", () => {
  assert.equal(getCountryFlagUri("NG"), "https://flagcdn.com/w40/ng.png");
  assert.equal(getCountryFlagUri("us"), "https://flagcdn.com/w40/us.png");
  assert.equal(getCountryFlagUri("../../evil.example/x"), null);
  assert.equal(getCountryFlagUri("https://evil.example"), null);
});

test("existing phone data initializes canonical country and preserves its local number", () => {
  const profile = normalizeProfile({
    phoneCountryCode: "NG",
    phoneNumber: "0803 123 4567",
  });
  assert.equal(profile.phoneCountryCode, "NG");
  assert.equal(
    serializePhone("US", profile.phoneNumber || "").phoneNumber,
    "0803 123 4567",
  );
  assert.equal(
    PHONE_COUNTRY_OPTIONS.find((x) => x.isoCode === "NG")?.dialCode,
    "+234",
  );
  assert.equal(
    PHONE_COUNTRY_OPTIONS.find((x) => x.isoCode === "US")?.dialCode,
    "+1",
  );
});
