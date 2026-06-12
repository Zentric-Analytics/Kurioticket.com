"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import type { LegalDocument } from "@/lib/types";
import { legalDeveloperNote } from "@/data/legalDocuments";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as englishTranslations } from "@/lib/i18n/en";

const privacyPolicySectionTranslations = {
  "data-we-collect": {
    title: "legalPrivacyPolicyDataWeCollectTitle",
    paragraphs: [
      "legalPrivacyPolicyDataWeCollectAccountParagraph",
      "legalPrivacyPolicyDataWeCollectProductParagraph",
    ],
  },
  vendors: {
    title: "legalPrivacyPolicyServiceProvidersTitle",
    paragraphs: [
      "legalPrivacyPolicyServiceProvidersOperationsParagraph",
      "legalPrivacyPolicyServiceProvidersCardsParagraph",
    ],
  },
  choices: {
    title: "legalPrivacyPolicyYourChoicesTitle",
    paragraphs: [
      "legalPrivacyPolicyYourChoicesRequestsParagraph",
      "legalPrivacyPolicyYourChoicesRetentionParagraph",
    ],
  },
} as const;

export function LegalViewer({ document }: { document: LegalDocument }) {
  const { t } = useLocale();
  const isPrivacyPolicy = document.slug === "privacy-policy";
  const localizedDocument = isPrivacyPolicy
    ? {
        ...document,
        title:
          t.legalPrivacyPolicyTitle ||
          englishTranslations.legalPrivacyPolicyTitle,
        summary:
          t.legalPrivacyPolicySummary ||
          englishTranslations.legalPrivacyPolicySummary,
        lastUpdated:
          t.legalPrivacyPolicyLastUpdatedDate ||
          englishTranslations.legalPrivacyPolicyLastUpdatedDate,
        sections: document.sections.map((section) => {
          const sectionTranslations =
            privacyPolicySectionTranslations[
              section.id as keyof typeof privacyPolicySectionTranslations
            ];

          if (!sectionTranslations) {
            return section;
          }

          return {
            ...section,
            title:
              t[sectionTranslations.title] ||
              englishTranslations[sectionTranslations.title],
            paragraphs: section.paragraphs.map((paragraph, index) => {
              const paragraphKey = sectionTranslations.paragraphs[index];

              return (
                (paragraphKey &&
                  (t[paragraphKey] || englishTranslations[paragraphKey])) ||
                paragraph
              );
            }),
          };
        }),
      }
    : document;
  const labels = {
    legalCenter: isPrivacyPolicy
      ? t.legalCenter || englishTranslations.legalCenter
      : englishTranslations.legalCenter,
    lastUpdated: isPrivacyPolicy
      ? t.legalLastUpdated || englishTranslations.legalLastUpdated
      : englishTranslations.legalLastUpdated,
    print: isPrivacyPolicy
      ? t.legalPrint || englishTranslations.legalPrint
      : englishTranslations.legalPrint,
    tableOfContents: isPrivacyPolicy
      ? t.legalTableOfContents || englishTranslations.legalTableOfContents
      : englishTranslations.legalTableOfContents,
  };
  const developerNote = isPrivacyPolicy
    ? t.legalPrivacyPolicyDeveloperNote ||
      englishTranslations.legalPrivacyPolicyDeveloperNote
    : legalDeveloperNote;

  return (
    <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
      <div className="legal-paper rounded-lg border p-4 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/legal" className="text-sm font-semibold text-teal-dark">
              {labels.legalCenter}
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-navy">
              {localizedDocument.title}
            </h1>
            <p className="mt-2 max-w-3xl text-muted">
              {localizedDocument.summary}
            </p>
            <p className="mt-3 text-sm font-semibold text-muted">
              {labels.lastUpdated}: {localizedDocument.lastUpdated}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-navy hover:bg-surface-muted"
          >
            <Printer size={17} />
            {labels.print}
          </button>
        </div>

        <div className="grid gap-8 py-6 lg:grid-cols-[260px_1fr]">
          <aside>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              {labels.tableOfContents}
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
