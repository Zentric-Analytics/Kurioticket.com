"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const ways = [
  ["exploreWaysRouteTitle", "exploreWaysRouteText"],
  ["exploreWaysHotelsTitle", "exploreWaysHotelsText"],
  ["exploreWaysSavedTitle", "exploreWaysSavedText"],
  ["exploreWaysBasicsTitle", "exploreWaysBasicsText"],
] as const;

const needs = [
  ["exploreNeedsWeekendTitle", "exploreNeedsWeekendText"],
  ["exploreNeedsInternationalTitle", "exploreNeedsInternationalText"],
  ["exploreNeedsHotelFirstTitle", "exploreNeedsHotelFirstText"],
  ["exploreNeedsCompleteTitle", "exploreNeedsCompleteText"],
] as const;

const checklist = [
  "exploreChecklistTime",
  "exploreChecklistBaggage",
  "exploreChecklistHotel",
  "exploreChecklistProvider",
  "exploreChecklistSave",
] as const;

export default function ExplorePage() {
  const { t } = useLocale();

  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-gradient-to-b from-indigo-50 via-white to-violet-50/40 pt-8 pb-12 sm:pt-10 lg:pt-12">
        <section className="page-shell">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-indigo-600">
              {t.explorePageEyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl">
              {t.exploreHeroTitle}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {t.exploreHeroSubtitle}
            </p>
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-extrabold tracking-tight text-indigo-950 sm:text-2xl">
              {t.exploreWaysTitle}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {ways.map(([titleKey, textKey]) => (
                <Card key={titleKey} className="h-full border-indigo-100 p-5">
                  <div className="mb-4 h-1.5 w-12 rounded-full bg-indigo-200" />
                  <h3 className="text-lg font-extrabold text-indigo-950">
                    {t[titleKey]}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t[textKey]}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-3xl border border-indigo-100 bg-white/85 p-5 shadow-[0_24px_70px_-45px_rgba(67,56,202,0.55)] sm:p-6">
            <h2 className="text-xl font-extrabold tracking-tight text-indigo-950 sm:text-2xl">
              {t.exploreNeedsTitle}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {needs.map(([titleKey, textKey]) => (
                <Card key={titleKey} className="border-indigo-100 p-5">
                  <h3 className="text-lg font-extrabold text-indigo-950">
                    {t[titleKey]}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t[textKey]}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <Card className="border-indigo-100 p-6">
              <h2 className="text-xl font-extrabold tracking-tight text-indigo-950 sm:text-2xl">
                {t.exploreChecklistTitle}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {checklist.map((itemKey) => (
                  <li
                    key={itemKey}
                    className="flex gap-3 text-sm font-medium leading-6 text-slate-600"
                  >
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-700">
                      ✓
                    </span>
                    <span>{t[itemKey]}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-96 lg:grid-cols-1">
              <LinkButton
                href="/flights"
                className="bg-indigo-700 text-white hover:bg-indigo-800"
              >
                {t.explorePrimaryCta}
              </LinkButton>
              <LinkButton
                href="/hotels"
                variant="secondary"
                className="border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
              >
                {t.exploreSecondaryCta}
              </LinkButton>
              <LinkButton
                href="/saved"
                variant="secondary"
                className="border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
              >
                {t.exploreSavedCta}
              </LinkButton>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </>
  );
}
