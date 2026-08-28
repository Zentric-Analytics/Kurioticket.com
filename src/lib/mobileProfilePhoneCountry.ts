import {
  defaultPhoneCountryOption,
  getSupportedPhoneCountryCode,
} from "@/lib/phoneProfile";

export function resolveMobileProfilePhoneCountry({
  savedCountryCode,
  detectedCountryCode,
}: {
  savedCountryCode?: string | null;
  detectedCountryCode?: string | null;
}) {
  return (
    getSupportedPhoneCountryCode(savedCountryCode) ??
    getSupportedPhoneCountryCode(detectedCountryCode) ??
    defaultPhoneCountryOption.isoCode
  );
}
