"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { translations as enTranslations } from "@/lib/i18n/en";

export function SettingsContent() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">
            {t("accountSettings.eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-navy">
            {t("accountSettings.title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {t("accountSettings.description")}
          </p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-bold text-navy">
              {t("accountSettings.notifications.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {t("accountSettings.notifications.description")}
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-navy">
              {t("accountSettings.privacy.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {t("accountSettings.privacy.description")}
            </p>
            <LinkButton href="/legal" variant="secondary" className="mt-4">
              {t("accountSettings.privacy.legalCenterCta")}
            </LinkButton>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
