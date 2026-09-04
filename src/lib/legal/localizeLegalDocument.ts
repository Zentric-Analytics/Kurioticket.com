import type { LegalDocument } from "@/lib/types";
import { getTranslations } from "@/lib/i18n";
import type { TranslationDictionary } from "@/lib/i18n/types";

const englishTranslations = getTranslations("en-us");
const namespaces: Record<string, string> = {
  "terms-of-service": "legal.terms", "acceptable-use-policy": "legal.acceptableUsePolicy",
  "privacy-policy": "legal.privacy", "cookie-policy": "legal.cookiePolicy",
  "privacy-choices": "legal.privacyChoices", "affiliate-disclosure": "legal.affiliateDisclosure",
  "data-deletion-policy": "legal.dataDeletionPolicy", "refund-booking-disclaimer": "legal.refundBookingDisclaimer",
  "price-availability-disclaimer": "legal.priceAvailabilityDisclaimer", "partner-redirect-disclaimer": "legal.partnerRedirectDisclaimer",
  "california-seller-of-travel-notice": "legal.californiaSellerOfTravelNotice",
  "legal-notice-company-information": "legal.legalNoticeCompanyInformation",
  "security-statement": "legal.securityStatement", "accessibility-statement": "legal.accessibilityStatement",
};
const translated = (dictionary: TranslationDictionary, key: string, fallback: string) => dictionary[key] || englishTranslations[key] || fallback;

export function getLegalDocumentTranslationNamespace(document: LegalDocument) { return namespaces[document.slug]; }
export function localizeLegalDocument(document: LegalDocument, dictionary: TranslationDictionary): LegalDocument {
  const namespace = getLegalDocumentTranslationNamespace(document);
  if (!namespace) return document;
  return { ...document,
    title: translated(dictionary, `${namespace}.title`, document.title),
    summary: translated(dictionary, `${namespace}.summary`, document.summary),
    lastUpdated: translated(dictionary, `${namespace}.lastUpdatedDate`, document.lastUpdated),
    sections: document.sections.map((section) => ({ ...section,
      title: translated(dictionary, `${namespace}.sections.${section.id}.title`, section.title),
      paragraphs: section.paragraphs.map((paragraph, index) => translated(dictionary, `${namespace}.sections.${section.id}.paragraph${index + 1}`, paragraph)),
    })),
  };
}
