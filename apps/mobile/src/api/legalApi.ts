import { getRuntimeEnvironment } from "../config/environment";
import type { MobileLocale } from "../localization/mobileLocalizationCatalog";

export type MobileLegalDocument = {
  slug: "terms-of-service" | "privacy-policy";
  title: string;
  summary: string;
  lastUpdated: string;
  lastUpdatedLabel: string;
  legalCenterLabel?: string;
  tableOfContentsLabel?: string;
  sections: { id: string; title: string; paragraphs: string[] }[];
};

export async function fetchLegalDocument(slug: MobileLegalDocument["slug"], locale: MobileLocale): Promise<MobileLegalDocument> {
  const { apiBaseUrl } = getRuntimeEnvironment();
  const response = await fetch(`${apiBaseUrl}/api/mobile/v1/legal/${slug}?locale=${encodeURIComponent(locale)}`, {
    credentials: "omit",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Unable to load legal document");
  return response.json() as Promise<MobileLegalDocument>;
}
