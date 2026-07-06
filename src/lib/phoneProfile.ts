import { personalDetailsCountryCodes, supportedRegions } from "@/lib/region/supportedRegions";

export type PhoneCountryOption = {
  countryName: string;
  isoCode: string;
  dialCode: string;
};

export const friendlyCountryLabelByIsoCode: Record<string, string> = {
  BO: "Bolivia",
  BM: "Bermuda",
  BN: "Brunei",
  CD: "Democratic Republic of the Congo",
  FM: "Micronesia",
  SX: "Sint Maarten",
  IR: "Iran",
  KP: "North Korea",
  KR: "South Korea",
  LA: "Laos",
  MD: "Moldova",
  PS: "Palestine",
  RU: "Russia",
  SY: "Syria",
  TZ: "Tanzania",
  VA: "Vatican City",
  VE: "Venezuela",
  VG: "British Virgin Islands",
  VI: "U.S. Virgin Islands",
  VN: "Vietnam",
};

export function getFriendlyCountryLabel(region: { code: string; country: string }) {
  return friendlyCountryLabelByIsoCode[region.code] ?? region.country;
}

export const countryCallingCodeByIsoCode: Record<string, string> = {
  AF: "+93", AL: "+355", DZ: "+213", AS: "+1", AD: "+376", AO: "+244", AI: "+1", AG: "+1", AR: "+54", AM: "+374", AU: "+61", AT: "+43", AZ: "+994",
  BS: "+1", BH: "+973", BD: "+880", BB: "+1", BY: "+375", BE: "+32", BZ: "+501", BJ: "+229", BM: "+1", BT: "+975", BO: "+591", BA: "+387", BW: "+267", BR: "+55", BN: "+673", BG: "+359", BF: "+226", BI: "+257",
  CV: "+238", KH: "+855", CM: "+237", CA: "+1", KY: "+1", CF: "+236", TD: "+235", CL: "+56", CN: "+86", CO: "+57", KM: "+269", CG: "+242", CD: "+243", CR: "+506", HR: "+385", CU: "+53", CY: "+357", CZ: "+420", CI: "+225",
  DK: "+45", DJ: "+253", DM: "+1", DO: "+1", EC: "+593", EG: "+20", SV: "+503", GQ: "+240", ER: "+291", EE: "+372", SZ: "+268", ET: "+251", FJ: "+679", FI: "+358", FR: "+33",
  GA: "+241", GM: "+220", GE: "+995", DE: "+49", GH: "+233", GR: "+30", GD: "+1", GU: "+1", GT: "+502", GN: "+224", GW: "+245", GY: "+592", HT: "+509", VA: "+39", HN: "+504", HU: "+36",
  IS: "+354", IN: "+91", ID: "+62", IR: "+98", IQ: "+964", IE: "+353", IL: "+972", IT: "+39", JM: "+1", JP: "+81", JO: "+962", KZ: "+7", KE: "+254", KI: "+686", KP: "+850", KR: "+82", KW: "+965", KG: "+996", LA: "+856",
  LV: "+371", LB: "+961", LS: "+266", LR: "+231", LY: "+218", LI: "+423", LT: "+370", LU: "+352", MG: "+261", MW: "+265", MY: "+60", MV: "+960", ML: "+223", MT: "+356", MH: "+692", MR: "+222", MU: "+230", MX: "+52", FM: "+691", MD: "+373", MC: "+377", MN: "+976", ME: "+382", MS: "+1", MA: "+212", MZ: "+258", MM: "+95",
  NA: "+264", NR: "+674", NP: "+977", NL: "+31", NZ: "+64", NI: "+505", NE: "+227", NG: "+234", MK: "+389", MP: "+1", NO: "+47", OM: "+968", PK: "+92", PW: "+680", PS: "+970", PA: "+507", PG: "+675", PY: "+595", PE: "+51", PH: "+63", PL: "+48", PT: "+351", PR: "+1", QA: "+974", RO: "+40", RU: "+7", RW: "+250",
  KN: "+1", LC: "+1", VC: "+1", WS: "+685", SM: "+378", ST: "+239", SA: "+966", SN: "+221", RS: "+381", SC: "+248", SL: "+232", SG: "+65", SX: "+1", SK: "+421", SI: "+386", SB: "+677", SO: "+252", ZA: "+27", SS: "+211", ES: "+34", LK: "+94", SD: "+249", SR: "+597", SE: "+46", CH: "+41", SY: "+963", TW: "+886", TJ: "+992", TZ: "+255", TH: "+66", TL: "+670", TG: "+228", TO: "+676", TT: "+1", TN: "+216", TR: "+90", TM: "+993", TC: "+1", TV: "+688", UG: "+256", UA: "+380", AE: "+971", GB: "+44", US: "+1", UY: "+598", UZ: "+998", VU: "+678", VE: "+58", VG: "+1", VI: "+1", VN: "+84", YE: "+967", ZM: "+260", ZW: "+263",
};


const additionalNanpPhoneCountryCodes = [
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

const phoneCountryCodes = new Set([
  ...personalDetailsCountryCodes,
  ...additionalNanpPhoneCountryCodes,
]);

export const phoneCountryOptions: PhoneCountryOption[] = supportedRegions
  .filter((region) => phoneCountryCodes.has(region.code))
  .map((region) => ({
    countryName: getFriendlyCountryLabel(region),
    isoCode: region.code,
    dialCode: countryCallingCodeByIsoCode[region.code],
  }))
  .filter((option): option is PhoneCountryOption => Boolean(option.dialCode))
  .sort((left, right) => left.countryName.localeCompare(right.countryName));

export const supportedPhoneCountryCodes = new Set(
  phoneCountryOptions.map((option) => option.isoCode),
);

export function getSupportedPhoneCountryCode(countryCode: string | null | undefined) {
  const normalizedCountryCode = countryCode?.trim().toUpperCase();

  if (!normalizedCountryCode) return null;

  return supportedPhoneCountryCodes.has(normalizedCountryCode)
    ? normalizedCountryCode
    : null;
}

export const defaultPhoneCountryOption =
  phoneCountryOptions.find((option) => option.isoCode === "NG") ?? phoneCountryOptions[0];

export function getDefaultPhoneCountryCode(countryCode: string | null | undefined) {
  return getSupportedPhoneCountryCode(countryCode) ?? defaultPhoneCountryOption?.isoCode ?? "";
}

export function parsePhoneDraftValue(value: string, defaultCountryCode?: string | null) {
  const trimmedValue = value.trim();
  const matchedOption = [...phoneCountryOptions]
    .sort((left, right) => right.dialCode.length - left.dialCode.length)
    .find(
      (option) =>
        trimmedValue === option.dialCode ||
        trimmedValue.startsWith(`${option.dialCode} `),
    );

  if (!matchedOption) {
    return {
      countryCode: getDefaultPhoneCountryCode(defaultCountryCode),
      hasRecognizedDialCode: false,
      localNumber: trimmedValue.replace(/^\+\d+\s*/, ""),
    };
  }

  return {
    countryCode: matchedOption.isoCode,
    hasRecognizedDialCode: true,
    localNumber: trimmedValue.slice(matchedOption.dialCode.length).trimStart(),
  };
}

export function formatPhoneDraftValue(countryCode: string, localNumber: string) {
  const selectedOption =
    phoneCountryOptions.find((option) => option.isoCode === countryCode) ??
    defaultPhoneCountryOption;

  if (!selectedOption) return localNumber.trimStart();
  const trimmedLocalNumber = localNumber.trimStart();

  return [selectedOption.dialCode, trimmedLocalNumber]
    .filter(Boolean)
    .join(" ");
}

export function getEffectivePhoneCountryCode({
  phoneCountryCode,
  phoneNumber,
  defaultCountryCode,
}: {
  phoneCountryCode?: string | null;
  phoneNumber: string;
  defaultCountryCode?: string | null;
}) {
  return (
    getSupportedPhoneCountryCode(phoneCountryCode) ??
    parsePhoneDraftValue(phoneNumber, defaultCountryCode).countryCode
  );
}
