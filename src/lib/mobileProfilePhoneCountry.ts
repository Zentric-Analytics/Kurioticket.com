import {
  defaultPhoneCountryOption,
  getSupportedPhoneCountryCode,
  parsePhoneDraftValue,
} from "@/lib/phoneProfile";

export function getExistingMobileProfilePhoneCountry({
  savedCountryCode,
  phoneNumber,
}: {
  savedCountryCode?: string | null;
  phoneNumber?: string | null;
}) {
  const saved = getSupportedPhoneCountryCode(savedCountryCode);
  if (saved) return saved;

  const parsed = parsePhoneDraftValue(phoneNumber || "");
  return parsed.hasRecognizedDialCode ? parsed.countryCode : null;
}

export function resolveMobileProfilePhoneCountry({
  savedCountryCode,
  phoneNumber,
  detectedCountryCode,
}: {
  savedCountryCode?: string | null;
  phoneNumber?: string | null;
  detectedCountryCode?: string | null;
}) {
  return (
    getExistingMobileProfilePhoneCountry({ savedCountryCode, phoneNumber }) ??
    getSupportedPhoneCountryCode(detectedCountryCode) ??
    defaultPhoneCountryOption.isoCode
  );
}
