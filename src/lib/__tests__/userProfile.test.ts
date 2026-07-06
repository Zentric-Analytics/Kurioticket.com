import assert from "node:assert/strict";
import test from "node:test";
import {
  countryCallingCodeByIsoCode,
  formatPhoneDraftValue,
  getEffectivePhoneCountryCode,
  parsePhoneDraftValue,
  phoneCountryOptions,
} from "@/lib/phoneProfile";
import { serializeUserProfile, userProfileSchema } from "@/lib/userProfile";

const requiredNanpPhoneCountryCodes = [
  "US",
  "CA",
  "BS",
  "BB",
  "JM",
  "DO",
  "TT",
  "AG",
  "DM",
  "GD",
  "KN",
  "LC",
  "VC",
  "AS",
  "AI",
  "BM",
  "VG",
  "KY",
  "GU",
  "MS",
  "MP",
  "PR",
  "SX",
  "TC",
  "VI",
] as const;

test("phone metadata supports all required NANP +1 country and territory codes", () => {
  const supportedCodes = new Set(phoneCountryOptions.map((option) => option.isoCode));

  for (const countryCode of requiredNanpPhoneCountryCodes) {
    assert.ok(supportedCodes.has(countryCode), `${countryCode} should be selectable`);
  }
});

test("all required NANP country and territory codes use +1", () => {
  for (const countryCode of requiredNanpPhoneCountryCodes) {
    const option = phoneCountryOptions.find((candidate) => candidate.isoCode === countryCode);

    assert.equal(countryCallingCodeByIsoCode[countryCode], "+1", `${countryCode} map entry should be +1`);
    assert.equal(option?.dialCode, "+1", `${countryCode} selector option should use +1`);
  }
});

test("userProfileSchema accepts and normalizes valid phoneCountryCode", () => {
  const profile = userProfileSchema.parse({
    phoneNumber: "+1 4165550100",
    phoneCountryCode: "ca",
  });

  assert.equal(profile.phoneNumber, "+1 4165550100");
  assert.equal(profile.phoneCountryCode, "CA");
});

test("userProfileSchema accepts newly supported NANP territories", () => {
  for (const phoneCountryCode of ["PR", "KY", "BM", "VI"] as const) {
    const profile = userProfileSchema.parse({ phoneCountryCode });

    assert.equal(profile.phoneCountryCode, phoneCountryCode);
  }
});

test("userProfileSchema rejects unsupported phoneCountryCode", () => {
  assert.throws(
    () => userProfileSchema.parse({ phoneCountryCode: "ZZ" }),
    /Unsupported phone country code/,
  );
});

test("serializeUserProfile returns phoneCountryCode safely", () => {
  assert.deepEqual(serializeUserProfile({ phoneNumber: "+1 8765550100", phoneCountryCode: "JM" }), {
    fullName: "",
    phoneNumber: "+1 8765550100",
    phoneCountryCode: "JM",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    address: "",
  });

  assert.equal(serializeUserProfile({ phoneNumber: "+1 5550100" }).phoneCountryCode, "");
});

test("saved phoneCountryCode is the source of truth for shared +1 numbers", () => {
  assert.notEqual(
    parsePhoneDraftValue("+1 4165550100", "US").countryCode,
    "CA",
    "legacy +1 parsing is ambiguous and does not reliably restore Canada",
  );
  assert.equal(
    getEffectivePhoneCountryCode({
      phoneCountryCode: "CA",
      phoneNumber: "+1 4165550100",
      defaultCountryCode: "US",
    }),
    "CA",
  );
});

test("shared +1 country and territory selections remain distinct in state", () => {
  const localNumber = "5550100";
  const countries = ["US", "CA", "JM", "PR", "VI"] as const;
  const states = countries.map((phoneCountryCode) => ({
    phoneCountryCode,
    phoneNumber: formatPhoneDraftValue(phoneCountryCode, localNumber),
  }));

  assert.deepEqual(states, [
    { phoneCountryCode: "US", phoneNumber: "+1 5550100" },
    { phoneCountryCode: "CA", phoneNumber: "+1 5550100" },
    { phoneCountryCode: "JM", phoneNumber: "+1 5550100" },
    { phoneCountryCode: "PR", phoneNumber: "+1 5550100" },
    { phoneCountryCode: "VI", phoneNumber: "+1 5550100" },
  ]);
  assert.equal(new Set(states.map((state) => state.phoneCountryCode)).size, 5);
});
