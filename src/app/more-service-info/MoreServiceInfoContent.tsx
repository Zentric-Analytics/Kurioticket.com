"use client";

import {
  Bell,
  ExternalLink,
  GitCompare,
  HelpCircle,
  Search,
  UserRound,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { LinkButton } from "@/components/ui/Button";
import { translations as enTranslations } from "@/lib/i18n/en";

const serviceSections = [
  {
    number: "01",
    titleKey: "moreServiceInfoStepSearchTitle",
    icon: Search,
    summaryKey: "moreServiceInfoStepSearchSummary",
    detailsKey: "moreServiceInfoStepSearchDetails",
  },
  {
    number: "02",
    titleKey: "moreServiceInfoStepCompareTitle",
    icon: GitCompare,
    summaryKey: "moreServiceInfoStepCompareSummary",
    detailsKey: "moreServiceInfoStepCompareDetails",
  },
  {
    number: "03",
    titleKey: "moreServiceInfoStepSaveTitle",
    icon: Bell,
    summaryKey: "moreServiceInfoStepSaveSummary",
    detailsKey: "moreServiceInfoStepSaveDetails",
  },
  {
    number: "04",
    titleKey: "moreServiceInfoStepRedirectsTitle",
    icon: ExternalLink,
    summaryKey: "moreServiceInfoStepRedirectsSummary",
    detailsKey: "moreServiceInfoStepRedirectsDetails",
  },
  {
    number: "05",
    titleKey: "moreServiceInfoStepAccountTitle",
    icon: UserRound,
    summaryKey: "moreServiceInfoStepAccountSummary",
    detailsKey: "moreServiceInfoStepAccountDetails",
  },
];

const serviceFaqs = [
  {
    questionKey: "moreServiceInfoFaqWhatQuestion",
    answerKey: "moreServiceInfoFaqWhatAnswer",
  },
  {
    questionKey: "moreServiceInfoFaqSearchQuestion",
    answerKey: "moreServiceInfoFaqSearchAnswer",
  },
  {
    questionKey: "moreServiceInfoFaqRedirectQuestion",
    answerKey: "moreServiceInfoFaqRedirectAnswer",
  },
  {
    questionKey: "moreServiceInfoFaqPaymentsQuestion",
    answerKey: "moreServiceInfoFaqPaymentsAnswer",
  },
  {
    questionKey: "moreServiceInfoFaqSaveQuestion",
    answerKey: "moreServiceInfoFaqSaveAnswer",
  },
  {
    questionKey: "moreServiceInfoFaqAccountQuestion",
    answerKey: "moreServiceInfoFaqAccountAnswer",
  },
  {
    questionKey: "moreServiceInfoFaqSupportQuestion",
    answerKey: "moreServiceInfoFaqSupportAnswer",
  },
];

export function MoreServiceInfoContent() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="grid items-center gap-8 lg:grid-cols-[1fr_0.72fr]">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-teal-dark">
              {t("moreServiceInfoEyebrow")}
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              {t("moreServiceInfoTitle")}
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
              {t("moreServiceInfoDescription")}
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-gradient-to-br from-surface-muted to-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal text-white shadow-sm">
                  <Search size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {t("moreServiceInfoContextTitle")}
                  </p>
                  <p className="text-xs text-muted">
                    {t("moreServiceInfoContextSubtitle")}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-navy">
                <div className="rounded-xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                  {t("moreServiceInfoContextCompare")}
                </div>
                <div className="rounded-xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                  {t("moreServiceInfoContextSave")}
                </div>
                <div className="rounded-xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                  {t("moreServiceInfoContextContinue")}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="how-kurioticket-works"
          className="mx-auto mt-10 max-w-5xl"
        >
          <div className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2
                  id="how-kurioticket-works"
                  className="text-2xl font-bold tracking-tight text-navy"
                >
                  {t("moreServiceInfoHowHeading")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                  {t("moreServiceInfoHowDescription")}
                </p>
              </div>
              <p className="rounded-full bg-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-dark">
                {t("moreServiceInfoHowBadge")}
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {serviceSections.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.titleKey}
                    className="grid gap-4 rounded-2xl border border-border/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-md sm:grid-cols-[auto_1fr] sm:p-5"
                  >
                    <div className="flex items-center gap-3 sm:block">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal/10 text-teal ring-1 ring-teal/15">
                        <Icon size={21} />
                      </div>
                      <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-teal-dark sm:mt-3">
                        {item.number}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-bold text-navy sm:text-xl">
                          {t(item.titleKey)}
                        </h3>
                        <span className="hidden h-px flex-1 bg-border sm:block" />
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-navy sm:text-[15px]">
                        {t(item.summaryKey)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted sm:text-[15px]">
                        {t(item.detailsKey)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="more-service-faq-heading"
          className="mt-10 max-w-3xl"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-teal/10 p-2 text-teal">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2
                id="more-service-faq-heading"
                className="text-2xl font-bold tracking-tight text-navy"
              >
                {t("moreServiceInfoFaqHeading")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                {t("moreServiceInfoFaqDescription")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-x-8 gap-y-1">
            {serviceFaqs.map((item) => (
              <details
                key={item.questionKey}
                className="group border-b border-border py-4"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold leading-6 text-navy marker:hidden sm:text-base">
                  <span>{t(item.questionKey)}</span>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 text-base leading-none text-muted transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                  {t(item.answerKey)}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 max-w-3xl rounded-2xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold text-navy">
            {t("moreServiceInfoHelpTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
            {t("moreServiceInfoHelpDescription")}
          </p>
          <LinkButton
            href="/support"
            variant="accent"
            size="lg"
            className="mt-5 w-full sm:w-auto"
          >
            {t("moreServiceInfoSupportCta")}
          </LinkButton>
        </section>
      </main>
      <Footer />
    </>
  );
}
