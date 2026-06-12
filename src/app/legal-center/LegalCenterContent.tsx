"use client";

import { Cookie, FileText, Scale, ShieldCheck } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { LinkButton } from "@/components/ui/Button";
import { translations as enTranslations } from "@/lib/i18n/en";

const legalSections = [
  {
    titleKey: "legalCenter.privacyPolicy.title",
    descriptionKey: "legalCenter.privacyPolicy.description",
    href: "/legal/privacy-policy",
    ctaKey: "legalCenter.privacyPolicy.cta",
    icon: ShieldCheck,
  },
  {
    titleKey: "legalCenter.termsOfService.title",
    descriptionKey: "legalCenter.termsOfService.description",
    href: "/legal/terms-of-service",
    ctaKey: "legalCenter.termsOfService.cta",
    icon: Scale,
  },
  {
    titleKey: "legalCenter.cookiePolicy.title",
    descriptionKey: "legalCenter.cookiePolicy.description",
    href: "/legal/cookie-policy",
    ctaKey: "legalCenter.cookiePolicy.cta",
    icon: Cookie,
  },
];

export function LegalCenterContent() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-teal-dark">{t("legalCenter.heroLabel")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {t("legalCenter.heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            {t("legalCenter.heroDescription")}
          </p>
        </section>

        <section aria-labelledby="legal-resources-heading" className="mx-auto mt-10 max-w-4xl">
          <div className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 id="legal-resources-heading" className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
                  {t("legalCenter.resourcesHeading")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                  {t("legalCenter.resourcesDescription")}
                </p>
              </div>
              <p className="rounded-full bg-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-dark">
                {t("legalCenter.policiesBadge")}
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {legalSections.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.titleKey}
                    className="grid gap-4 rounded-2xl border border-border/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-md sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal/10 text-teal ring-1 ring-teal/15">
                      <Icon size={21} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-navy sm:text-lg">{t(item.titleKey)}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted sm:text-[15px]">{t(item.descriptionKey)}</p>
                    </div>

                    <LinkButton href={item.href} variant="secondary" className="w-full sm:w-auto">
                      {t(item.ctaKey)}
                    </LinkButton>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-4xl rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-teal-dark">
              <FileText size={21} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy">{t("legalCenter.additionalResourcesTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                {t("legalCenter.additionalResourcesDescription")}
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
