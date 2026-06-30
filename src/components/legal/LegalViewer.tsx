"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getTranslations } from "@/lib/i18n";
import type { LegalDocument } from "@/lib/types";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { legalDeveloperNote } from "@/data/legalDocuments";

const englishTranslations = getTranslations("en-us");

function getTranslation(
  t: TranslationDictionary,
  key: string,
  fallback: string,
) {
  return t[key] || englishTranslations[key] || fallback;
}

function getLocaleTranslation(
  t: TranslationDictionary,
  key: string,
  fallback: string,
) {
  return t[key] || fallback;
}

const legalDocumentTranslationNamespaces: Record<string, string> = {
  "terms-of-service": "legal.terms",
  "acceptable-use-policy": "legal.acceptableUsePolicy",
  "privacy-policy": "legal.privacy",
  "cookie-policy": "legal.cookiePolicy",
  "privacy-choices": "legal.privacyChoices",
  "affiliate-disclosure": "legal.affiliateDisclosure",
  "data-deletion-policy": "legal.dataDeletionPolicy",
  "refund-booking-disclaimer": "legal.refundBookingDisclaimer",
  "price-availability-disclaimer": "legal.priceAvailabilityDisclaimer",
  "partner-redirect-disclaimer": "legal.partnerRedirectDisclaimer",
  "california-seller-of-travel-notice": "legal.californiaSellerOfTravelNotice",
  "legal-notice-company-information": "legal.legalNoticeCompanyInformation",
  "security-statement": "legal.securityStatement",
  "accessibility-statement": "legal.accessibilityStatement",
};

function getLegalDocumentTranslationNamespace(document: LegalDocument) {
  return legalDocumentTranslationNamespaces[document.slug];
}

function getLegalDocumentTranslation(
  document: LegalDocument,
  t: TranslationDictionary,
): LegalDocument {
  const namespace = getLegalDocumentTranslationNamespace(document);

  if (!namespace) {
    return document;
  }

  return {
    ...document,
    title: getTranslation(t, `${namespace}.title`, document.title),
    summary: getTranslation(t, `${namespace}.summary`, document.summary),
    lastUpdated: getTranslation(
      t,
      `${namespace}.lastUpdatedDate`,
      document.lastUpdated,
    ),
    sections: document.sections.map((section) => ({
      ...section,
      title: getTranslation(
        t,
        `${namespace}.sections.${section.id}.title`,
        section.title,
      ),
      paragraphs: section.paragraphs.map((paragraph, index) =>
        getTranslation(
          t,
          `${namespace}.sections.${section.id}.paragraph${index + 1}`,
          paragraph,
        ),
      ),
    })),
  };
}

function formatLegalDate(value: string, locale: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function LegalViewer({ document }: { document: LegalDocument }) {
  const { locale, t } = useLocale();
  const localizedDocument = getLegalDocumentTranslation(document, t);
  const legalDocumentTranslationNamespace =
    getLegalDocumentTranslationNamespace(document);
  const formattedLastUpdated = formatLegalDate(document.lastUpdated, locale);
  const lastUpdatedLabel = getTranslation(
    t,
    "legal.lastUpdated",
    englishTranslations["legal.lastUpdated"],
  );
  const lastUpdatedText = `${lastUpdatedLabel}: ${formattedLastUpdated}`;
  const developerNote = legalDocumentTranslationNamespace
    ? getTranslation(
        t,
        `${legalDocumentTranslationNamespace}.developerNote`,
        legalDeveloperNote,
      )
    : legalDeveloperNote;
  const sharedTableOfContentsLabel = getTranslation(
    t,
    "legal.tableOfContents",
    englishTranslations["legal.tableOfContents"],
  );
  const tableOfContentsLabel = legalDocumentTranslationNamespace
    ? getLocaleTranslation(
        t,
        `${legalDocumentTranslationNamespace}.tableOfContents`,
        sharedTableOfContentsLabel,
      )
    : sharedTableOfContentsLabel;

  return (
    <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
      <div className="legal-paper rounded-lg border p-4 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/legal"
              className="text-sm font-semibold text-teal-dark"
            >
              {t.legalCenter}
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-navy">
              {localizedDocument.title}
            </h1>
            <p className="mt-2 max-w-3xl text-muted">
              {localizedDocument.summary}
            </p>
            <p className="mt-3 text-sm font-semibold text-muted">
              {lastUpdatedText}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-navy hover:bg-surface-muted"
            aria-label={t["legal.print"]}
            title={t["legal.print"]}
          >
            <Printer size={17} />
            {t["legal.print"]}
          </button>
        </div>

        <div className="grid gap-8 py-6 lg:grid-cols-[260px_1fr]">
          <aside>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              {tableOfContentsLabel}
            </h2>
            <nav className="mt-3 grid gap-2">
              {localizedDocument.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-sm font-semibold text-navy hover:text-teal-dark"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 space-y-8">
            {localizedDocument.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24"
              >
                <h2 className="text-xl font-bold text-navy">{section.title}</h2>
                <div className="mt-3 space-y-3 text-base leading-7 text-slate-700">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
            <div className="rounded-md border border-amber/30 bg-amber/10 p-4 text-sm leading-6 text-amber">
              {developerNote}
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
