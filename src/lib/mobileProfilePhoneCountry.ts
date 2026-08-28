import {
  defaultPhoneCountryOption,
  getSupportedPhoneCountryCode,
  parsePhoneDraftValue,
} from "@/lib/phoneProfile";

export function resolveMobileProfilePhoneCountry({
  savedCountryCode,
  phoneNumber,
  detectedCountryCode,
}: {
  savedCountryCode?: string | null;
  phoneNumber?: string | null;
  detectedCountryCode?: string | null;
}) {
  const saved = getSupportedPhoneCountryCode(savedCountryCode);
  if (saved) return saved;

  const parsed = parsePhoneDraftValue(phoneNumber || "");
  if (parsed.hasRecognizedDialCode) return parsed.countryCode;

  return (
    getSupportedPhoneCountryCode(detectedCountryCode) ??
    defaultPhoneCountryOption.isoCode
  );
}
