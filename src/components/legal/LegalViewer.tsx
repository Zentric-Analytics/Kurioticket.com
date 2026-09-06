"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getTranslations } from "@/lib/i18n";
import type { LegalDocument } from "@/lib/types";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { getLegalDocumentTranslationNamespace, localizeLegalDocument } from "@/lib/legal/localizeLegalDocument";

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

function getLegalDocumentTranslation(document: LegalDocument, t: TranslationDictionary): LegalDocument {
  return localizeLegalDocument(document, t);
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

export function LegalViewer({
  document,
  appBrowser = false,
}: {
  document: LegalDocument;
  appBrowser?: boolean;
}) {
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
    <main
      className={
        appBrowser
          ? "min-h-screen bg-white px-4 pb-10 pt-5 sm:px-6 sm:pt-7"
          : "page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28"
      }
    >
      <div
        className={
          appBrowser
            ? "mx-auto max-w-3xl"
            : "legal-paper rounded-lg border p-4 shadow-sm md:p-8"
        }
      >
        <div
          className={
            appBrowser
              ? "border-b border-border pb-5"
              : "flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between"
          }
        >
          <div>
            {!appBrowser && (
              <Link
                href="/legal"
                className="text-sm font-semibold text-teal-dark"
              >
                {t.legalCenter}
              </Link>
            )}
            <h1
              className={
                appBrowser
                  ? "text-2xl font-bold tracking-tight text-navy sm:text-3xl"
                  : "mt-3 text-3xl font-bold text-navy"
              }
            >
              {localizedDocument.title}
            </h1>
            <p className="mt-2 max-w-3xl text-muted">
              {localizedDocument.summary}
            </p>
            <p className="mt-3 text-sm font-semibold text-muted">
              {lastUpdatedText}
            </p>
          </div>
          {!appBrowser && (
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
          )}
        </div>

        <div
          className={
            appBrowser ? "py-6" : "grid gap-8 py-6 lg:grid-cols-[260px_1fr]"
          }
        >
          {!appBrowser && (
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
          )}

          <article className={appBrowser ? "min-w-0 space-y-7" : "min-w-0 space-y-8"}>
            {localizedDocument.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className={appBrowser ? "scroll-mt-6" : "scroll-mt-24"}
              >
                <h2 className={appBrowser ? "text-lg font-bold text-navy" : "text-xl font-bold text-navy"}>
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-base leading-7 text-slate-700">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </main>
  );
}
