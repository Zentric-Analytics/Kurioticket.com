"use client";

import Link from "next/link";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Card } from "@/components/ui/Card";
import type { LegalDocument } from "@/lib/types";
import { translations as enTranslations } from "@/lib/i18n/en";

type LegalPageContentProps = {
  documents: LegalDocument[];
};

const legalIndexDocumentKeys: Record<string, string> = {
  "terms-of-service": "termsOfService",
  "privacy-policy": "privacyPolicy",
  "cookie-policy": "cookiePolicy",
  "affiliate-disclosure": "affiliateDisclosure",
  "refund-booking-disclaimer": "refundBookingDisclaimer",
  "acceptable-use-policy": "acceptableUsePolicy",
  "data-deletion-policy": "dataDeletionPolicy",
  "price-availability-disclaimer": "priceAvailabilityDisclaimer",
  "partner-redirect-disclaimer": "partnerRedirectDisclaimer",
};

export function LegalPageContent({ documents }: LegalPageContentProps) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">
            {t("legal.index.heroLabel")}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-navy">
            {t("legal.index.heroTitle")}
          </h1>
          <p className="mt-3 text-muted">{t("legal.index.developerNote")}</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {documents.map((document) => {
            const documentKey = legalIndexDocumentKeys[document.slug];
            const title = documentKey
              ? t(`legal.index.documents.${documentKey}.title`)
              : document.title;
            const summary = documentKey
              ? t(`legal.index.documents.${documentKey}.summary`)
              : document.summary;

            return (
              <Link key={document.slug} href={`/legal/${document.slug}`}>
                <Card className="h-full p-5 transition hover:border-teal hover:shadow-md">
                  <h2 className="font-bold text-navy">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{summary}</p>
                  <p className="mt-3 text-xs font-semibold text-teal-dark">
                    {t("legal.index.lastUpdated")}:{" "}
                    {t("legal.index.lastUpdatedDate")}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
