import { mobileLocaleCodes } from "./mobileLocalizationCatalog";
import { securityCopy } from "../features/profile/securityLocalization";
import { localizedSecurityCopy } from "../features/profile/securityTranslationCorrections";

for (const locale of mobileLocaleCodes) {
  Object.assign(securityCopy[locale], localizedSecurityCopy(locale, securityCopy[locale]));
}
