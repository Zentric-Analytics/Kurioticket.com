"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";


export default function OnboardingPage() {
  const { t } = useLocale();

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <Card className="mx-auto max-w-3xl p-5">
          <p className="text-sm font-semibold text-teal-dark">{t["onboarding.eyebrow"]}</p>
          <h1 className="mt-1 text-3xl font-bold text-navy">{t["onboarding.title"]}</h1>
          <p className="mt-2 text-muted">{t["onboarding.description"]}</p>
          <form className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label={t["onboarding.homeAirport"]}>
              <Input name="homeAirport" placeholder="IAH" />
            </Field>
            <Field label={t["onboarding.preferredAirlines"]}>
              <Input name="airlines" placeholder="Delta, United" />
            </Field>
            <Field label={t["onboarding.budgetStyle"]}>
              <Select name="budgetStyle">
                <option>{t["onboarding.budgetStyle.lowestReasonableFare"]}</option>
                <option>{t["onboarding.budgetStyle.balancedValue"]}</option>
                <option>{t["onboarding.budgetStyle.comfortWhenItMatters"]}</option>
              </Select>
            </Field>
            <Field label={t["onboarding.directVsCheaper"]}>
              <Select name="directVsCheaper">
                <option>{t["onboarding.directVsCheaper.preferDirectWhenClose"]}</option>
                <option>{t["onboarding.directVsCheaper.chooseCheaperIfLayoverGood"]}</option>
                <option>{t["onboarding.directVsCheaper.alwaysMinimizeTravelEffort"]}</option>
              </Select>
            </Field>
            <Field label={t["onboarding.travelFrequency"]}>
              <Select name="travelFrequency">
                <option>{t["onboarding.travelFrequency.fewTimesYear"]}</option>
                <option>{t["onboarding.travelFrequency.monthly"]}</option>
                <option>{t["onboarding.travelFrequency.oftenForWork"]}</option>
              </Select>
            </Field>
            <Field label={t["onboarding.travelPurpose"]}>
              <Select name="travelPurpose">
                <option>{t["onboarding.travelPurpose.leisure"]}</option>
                <option>{t["onboarding.travelPurpose.family"]}</option>
                <option>{t["onboarding.travelPurpose.business"]}</option>
                <option>{t["onboarding.travelPurpose.mixed"]}</option>
              </Select>
            </Field>
          </form>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/dashboard" variant="accent">{t["onboarding.savePreferencesLater"]}</LinkButton>
            <LinkButton href="/dashboard" variant="secondary">{t["onboarding.skip"]}</LinkButton>
          </div>
        </Card>
      </main>
      <Footer />
    </>
  );
}
