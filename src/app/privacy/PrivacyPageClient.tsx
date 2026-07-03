"use client";

import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";

const privacySections = [
  {
    titleKey: "privacySectionInformationTitle",
    bodyKey: "privacySectionInformationBody",
  },
  {
    titleKey: "privacySectionUseTitle",
    bodyKey: "privacySectionUseBody",
  },
  {
    titleKey: "privacySectionProvidersTitle",
    bodyKey: "privacySectionProvidersBody",
  },
  {
    titleKey: "privacySectionChoicesTitle",
    bodyKey: "privacySectionChoicesBody",
  },
] as const;

export function PrivacyPageClient() {
  const { t } = useLocale();

  return (
    <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold text-teal-dark">
          {t.privacyPageEyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          {t.privacyHeroTitle}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
          {t.privacyHeroSubtitle}
        </p>
      </section>

      <section className="mt-8 max-w-3xl rounded-2xl border border-amber/30 bg-amber/10 p-5 text-sm leading-6 text-amber sm:p-6 sm:text-base">
        <div className="flex gap-3">
          <AlertTriangle
            className="mt-0.5 shrink-0"
            size={20}
            aria-hidden="true"
          />
          <p>{t.privacyNoticeBody}</p>
        </div>
      </section>

      <section className="mt-8 grid max-w-4xl gap-4">
        {privacySections.map((section) => (
          <article
            key={section.titleKey}
            className="rounded-2xl border border-border bg-white p-5 shadow-[0_16px_40px_-28px_rgba(30,27,75,0.45)] sm:p-6"
          >
            <div className="flex gap-3">
              <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal-dark">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-navy">
                  {t[section.titleKey]}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                  {t[section.bodyKey]}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 max-w-3xl text-sm leading-6 text-muted sm:text-base">
        <p>
          {t.privacyLegalCenterBeforeLink}{" "}
          <Link
            href="/legal/privacy-policy"
            className="font-bold text-teal-dark underline-offset-4 hover:underline"
          >
            {t.privacyLegalCenterLink}
          </Link>
          {t.privacyLegalCenterAfterLink}
        </p>
      </section>
    </main>
  );
}
