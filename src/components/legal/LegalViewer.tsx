"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import type { LegalDocument } from "@/lib/types";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { legalDeveloperNote } from "@/data/legalDocuments";

const localizedDocumentKeys: Record<string, string> = {
  "terms-of-service": "legal.terms",
  "cookie-policy": "legal.cookiePolicy",
};

function getLocalizedDocumentTranslation(
  document: LegalDocument,
  t: TranslationDictionary
): LegalDocument {
  const documentKey = localizedDocumentKeys[document.slug];

  if (!documentKey) {
    return document;
  }

  return {
    ...document,
    title: t[`${documentKey}.title`] || document.title,
    summary: t[`${documentKey}.summary`] || document.summary,
    lastUpdated: t[`${documentKey}.lastUpdatedDate`] || document.lastUpdated,
    sections: document.sections.map((section) => ({
      ...section,
      title: t[`${documentKey}.sections.${section.id}.title`] || section.title,
      paragraphs: section.paragraphs.map(
        (paragraph, index) =>
          t[`${documentKey}.sections.${section.id}.paragraph${index + 1}`] ||
          paragraph
      ),
    })),
  };
}

export function LegalViewer({ document }: { document: LegalDocument }) {
  const { t } = useLocale();
  const localizedDocument = getLocalizedDocumentTranslation(document, t);
  const documentKey = localizedDocumentKeys[document.slug];
  const lastUpdatedText = documentKey
    ? t[`${documentKey}.lastUpdated`] ||
      `${t["legal.lastUpdated"]}: ${localizedDocument.lastUpdated}`
    : `${t["legal.lastUpdated"]}: ${localizedDocument.lastUpdated}`;
  const developerNote = documentKey
    ? t[`${documentKey}.developerNote`] || legalDeveloperNote
    : legalDeveloperNote;

  return (
    <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
      <div className="legal-paper rounded-lg border p-4 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/legal" className="text-sm font-semibold text-teal-dark">
              {t.legalCenter}
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-navy">{localizedDocument.title}</h1>
            <p className="mt-2 max-w-3xl text-muted">{localizedDocument.summary}</p>
            <p className="mt-3 text-sm font-semibold text-muted">{lastUpdatedText}</p>
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
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t["legal.tableOfContents"]}</h2>
            <nav className="mt-3 grid gap-2">
              {localizedDocument.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="text-sm font-semibold text-navy hover:text-teal-dark">
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 space-y-8">
            {localizedDocument.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
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
