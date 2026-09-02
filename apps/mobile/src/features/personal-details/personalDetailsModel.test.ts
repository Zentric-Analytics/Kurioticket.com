import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalDate,
  clampPersonalDetailsDateOfBirth,
  COUNTRY_OPTIONS,
  displayAddress,
  filterSelectorOptions,
  displayPhone,
  GENDER_VALUES,
  getCountryFlagUri,
  isEligiblePersonalDetailsDateOfBirth,
  NATIONALITY_OPTIONS,
  normalizeProfile,
  parseAddress,
  PERSONAL_DETAIL_ORDER,
  personalDetailsLatestDateOfBirth,
  PHONE_COUNTRY_OPTIONS,
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
test("read-only phone display is country-neutral, preserves missing values, and never repeats dial codes", () => {
  assert.equal(displayPhone("NG", ""), "");
  assert.equal(displayPhone("NG", "7056890436"), "+234 7056890436");
  assert.equal(displayPhone("NG", "+234 7056890436"), "+234 7056890436");
  assert.equal(displayPhone("US", "4165550100"), "+1 4165550100");
  assert.equal(displayPhone("US", "+1 4165550100"), "+1 4165550100");
  assert.equal(displayPhone("GB", "2079460958"), "+44 2079460958");
  assert.equal(displayPhone("GB", "+44 2079460958"), "+44 2079460958");
  assert.equal(displayPhone("FR", "142685300"), "+33 142685300");
  assert.equal(displayPhone("FR", "+33 142685300"), "+33 142685300");
});
test("selector matching supports labels, ISO codes, and phone calling codes", () => {
  const nigeria = PHONE_COUNTRY_OPTIONS.find(
    (option) => option.isoCode === "NG",
  );
  assert.ok(nigeria);
  const options = [
    {
      label: nigeria.countryName,
      value: nigeria.isoCode,
      searchTerms: [
        nigeria.isoCode,
        nigeria.dialCode,
        nigeria.dialCode.slice(1),
      ],
    },
  ];
  for (const query of ["Nigeria", "NG", "+234", "234"])
    assert.deepEqual(filterSelectorOptions(options, query), options);
});
test("date selection emits canonical dates and rejects impossible or future dates", () => {
  assert.equal(canonicalDate("2000", "2", "29"), "2000-02-29");
  assert.equal(canonicalDate("2023", "2", "29"), null);
  assert.equal(canonicalDate("2999", "1", "1"), null);
});
test("Personal details DOB clamps to the exact 18th-birthday cutoff", () => {
  const referenceDate = new Date("2026-09-02T12:00:00Z");
  assert.equal(personalDetailsLatestDateOfBirth(referenceDate), "2008-09-02");
  assert.equal(isEligiblePersonalDetailsDateOfBirth("2008-09-02", referenceDate), true);
  assert.equal(isEligiblePersonalDetailsDateOfBirth("2008-09-03", referenceDate), false);
  assert.equal(clampPersonalDetailsDateOfBirth("2008-09-03", referenceDate), "2008-09-02");
  assert.equal(clampPersonalDetailsDateOfBirth("2000-02-29", referenceDate), "2000-02-29");
});
test("gender and nationality use canonical supported options", () => {
  assert.deepEqual(GENDER_VALUES, ["Male", "Female", "I prefer not to say"]);
  assert.ok(NATIONALITY_OPTIONS.includes("United States"));
});
test("structured addresses round trip, trim display punctuation, and legacy values remain readable", () => {
  const legacy = "1 Main St\nLagos\nNigeria";
  assert.equal(parseAddress(legacy).addressLine1, "1 Main St");
  const encoded = serializeAddress({
    ...parseAddress(""),
    countryCode: "AR",
    apartmentOrSuite: "Kuola ",
    addressLine1: "C2 legacy ",
    city: "Ibadan ",
    stateOrRegion: "Ibadan ",
    postalCode: "1111111122222 ",
  });
  assert.ok(encoded.startsWith(STRUCTURED_ADDRESS_PREFIX));
  assert.equal(parseAddress(encoded).addressLine1, "C2 legacy ");
  assert.equal(
    displayAddress(encoded),
    "Kuola, C2 legacy\nIbadan, Ibadan 1111111122222\nArgentina",
  );
});
test("malformed structured address members cannot crash read-only display", () => {
  const malformed = `${STRUCTURED_ADDRESS_PREFIX}${JSON.stringify({
    countryCode: "NG",
    addressLine1: 7,
    apartmentOrSuite: { value: "Suite 2" },
    city: " Lagos ",
    stateOrRegion: false,
    postalCode: null,
  })}`;
  assert.deepEqual(parseAddress(malformed), {
    countryCode: "NG",
    addressLine1: "",
    apartmentOrSuite: "",
    city: " Lagos ",
    stateOrRegion: "",
    postalCode: "",
  });
  assert.equal(displayAddress(malformed), "Lagos\nNigeria");
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
