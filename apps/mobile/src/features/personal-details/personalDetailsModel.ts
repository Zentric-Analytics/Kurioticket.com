import { personalDetailsCountryOptions } from "../../../../../src/lib/region/supportedRegions";
import {
  defaultPhoneCountryOption,
  getSupportedPhoneCountryCode,
  parsePhoneDraftValue,
  phoneCountryOptions,
} from "../../../../../src/lib/phoneProfile";
import type { MobileProfile } from "../../api/travelApi";

export const PERSONAL_DETAIL_ORDER = [
  "fullName",
  "email",
  "phoneNumber",
  "dateOfBirth",
  "gender",
  "nationality",
  "address",
] as const;
export const GENDER_VALUES = ["Male", "Female", "I prefer not to say"] as const;
export const STRUCTURED_ADDRESS_PREFIX = "kt-address-v1:";
export type AddressParts = {
  countryCode: string;
  addressLine1: string;
  apartmentOrSuite: string;
  city: string;
  stateOrRegion: string;
  postalCode: string;
};
export const EMPTY_ADDRESS: AddressParts = {
  countryCode: "",
  addressLine1: "",
  apartmentOrSuite: "",
  city: "",
  stateOrRegion: "",
  postalCode: "",
};
export const COUNTRY_OPTIONS = personalDetailsCountryOptions
  .map((region) => ({ code: region.code, label: region.country }))
  .sort((a, b) => a.label.localeCompare(b.label));
export const NATIONALITY_OPTIONS = COUNTRY_OPTIONS.map(
  (option) => option.label,
);
export const PHONE_COUNTRY_OPTIONS = phoneCountryOptions;

/** Builds only validated FlagCDN URLs; caller input can never become a host or path. */
export function getCountryFlagUri(value: string | null | undefined) {
  const isoCode = getSupportedPhoneCountryCode(value);
  return isoCode
    ? `https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`
    : null;
}

export function normalizeProfile(profile: MobileProfile): MobileProfile {
  return {
    fullName: profile.fullName?.trim() || "",
    phoneCountryCode:
      getSupportedPhoneCountryCode(profile.phoneCountryCode) ||
      defaultPhoneCountryOption.isoCode,
    phoneNumber: profile.phoneNumber?.trim() || "",
    dateOfBirth: profile.dateOfBirth?.trim() || "",
    gender: profile.gender?.trim() || "",
    nationality: profile.nationality?.trim() || "",
    address: profile.address?.trim() || "",
  };
}
export function profilesDiffer(a: MobileProfile, b: MobileProfile) {
  const left = normalizeProfile(a),
    right = normalizeProfile(b);
  return (
    [
      "fullName",
      "phoneCountryCode",
      "phoneNumber",
      "dateOfBirth",
      "gender",
      "nationality",
      "address",
    ] as const
  ).some((key) => left[key] !== right[key]);
}
export function parseAddress(value: string): AddressParts {
  const trimmed = value.trim();
  if (!trimmed) return { ...EMPTY_ADDRESS };
  if (trimmed.startsWith(STRUCTURED_ADDRESS_PREFIX)) {
    try {
      const raw: unknown = JSON.parse(
        trimmed.slice(STRUCTURED_ADDRESS_PREFIX.length),
      );
      if (raw && typeof raw === "object") {
        const p = raw as Partial<AddressParts> & { streetAddress?: string };
        return {
          countryCode: p.countryCode || "",
          addressLine1: p.addressLine1 || p.streetAddress || "",
          apartmentOrSuite: p.apartmentOrSuite || "",
          city: p.city || "",
          stateOrRegion: p.stateOrRegion || "",
          postalCode: p.postalCode || "",
        };
      }
    } catch {
      return { ...EMPTY_ADDRESS };
    }
  }
  const [addressLine1 = "", city = "", postalOrCountry = "", country = ""] =
    trimmed.split(/\r?\n/).map((x) => x.trim());
  const countryValue = country || postalOrCountry;
  const match = COUNTRY_OPTIONS.find(
    (x) =>
      x.code.toLowerCase() === countryValue.toLowerCase() ||
      x.label.toLowerCase() === countryValue.toLowerCase(),
  );
  return {
    ...EMPTY_ADDRESS,
    addressLine1,
    city,
    postalCode: country ? postalOrCountry : "",
    countryCode: match?.code || "",
  };
}
export function serializeAddress(parts: AddressParts) {
  const normalized = {
    countryCode: parts.countryCode,
    addressLine1: parts.addressLine1.trimStart(),
    apartmentOrSuite: parts.apartmentOrSuite.trimStart(),
    city: parts.city.trimStart(),
    stateOrRegion: parts.stateOrRegion.trimStart(),
    postalCode: parts.postalCode.trimStart(),
  };
  return Object.values(normalized).some(Boolean)
    ? `${STRUCTURED_ADDRESS_PREFIX}${JSON.stringify(normalized)}`
    : "";
}
export function displayAddress(value: string) {
  if (!value.startsWith(STRUCTURED_ADDRESS_PREFIX)) return value.trim();
  const p = parseAddress(value);
  const street = [p.apartmentOrSuite, p.addressLine1]
    .filter(Boolean)
    .join(", ");
  const locality = [
    [p.city, p.stateOrRegion].filter(Boolean).join(", "),
    p.postalCode,
  ]
    .filter(Boolean)
    .join(" ");
  const country =
    COUNTRY_OPTIONS.find((x) => x.code === p.countryCode)?.label ||
    p.countryCode;
  return [street, locality, country].filter(Boolean).join("\n");
}
export function serializePhone(countryCode: string, localNumber: string) {
  const country =
    getSupportedPhoneCountryCode(countryCode) ||
    defaultPhoneCountryOption.isoCode;
  const parsed = parsePhoneDraftValue(localNumber, country);
  return { phoneCountryCode: country, phoneNumber: parsed.localNumber };
}
export function canonicalDate(year: string, month: string, day: string) {
  if (
    !/^\d{4}$/.test(year) ||
    !/^\d{1,2}$/.test(month) ||
    !/^\d{1,2}$/.test(day)
  )
    return null;
  const y = Number(year),
    m = Number(month),
    d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d ||
    date.getTime() > Date.now()
  )
    return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
