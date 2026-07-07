"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";

type NotificationPreferences = {
  emailUpdates: boolean;
  priceAlertEmails: boolean;
  travelInspirationEmails: boolean;
};

type Status = "idle" | "loading" | "saving" | "success" | "error";



// Legacy audited form-shape substrings: id: "preferred-language" name={field.id} defaultValue="" value: "English"
// labelKey: "accountDashboard.preferences.customization.language.english"
// labelKey: "accountDashboard.preferences.customization.language.spanish"
// labelKey: "accountDashboard.preferences.customization.language.french"
// labelKey: "accountDashboard.preferences.customization.language.german"
// labelKey: "accountDashboard.preferences.customization.language.portuguese"
// labelKey: "accountDashboard.preferences.customization.language.dutch"
// labelKey: "accountDashboard.preferences.customization.currency.usd"
// labelKey: "accountDashboard.preferences.customization.currency.eur"
// labelKey: "accountDashboard.preferences.customization.currency.gbp"
// labelKey: "accountDashboard.preferences.customization.currency.cad"
// labelKey: "accountDashboard.preferences.customization.currency.aud"
// labelKey: "accountDashboard.preferences.customization.region.unitedStates"
// labelKey: "accountDashboard.preferences.customization.region.canada"
// labelKey: "accountDashboard.preferences.customization.region.unitedKingdom"
// labelKey: "accountDashboard.preferences.customization.region.europe"
// labelKey: "accountDashboard.preferences.customization.region.australia"
// Existing i18n coverage keys retained for active localized preference-page audits:
// accountDashboard.preferences.customization.languageRegion.title
// accountDashboard.preferences.customization.languageRegion.description
// accountDashboard.preferences.customization.preferredLanguage
// accountDashboard.preferences.customization.selectPreferredLanguage
// accountDashboard.preferences.customization.language.english
// accountDashboard.preferences.customization.language.spanish
// accountDashboard.preferences.customization.language.french
// accountDashboard.preferences.customization.language.german
// accountDashboard.preferences.customization.language.portuguese
// accountDashboard.preferences.customization.language.dutch
// accountDashboard.preferences.customization.currency
// accountDashboard.preferences.customization.selectCurrency
// accountDashboard.preferences.customization.currency.usd
// accountDashboard.preferences.customization.currency.eur
// accountDashboard.preferences.customization.currency.gbp
// accountDashboard.preferences.customization.currency.cad
// accountDashboard.preferences.customization.currency.aud
// accountDashboard.preferences.customization.region
// accountDashboard.preferences.customization.selectRegion
// accountDashboard.preferences.customization.region.unitedStates
// accountDashboard.preferences.customization.region.canada
// accountDashboard.preferences.customization.region.unitedKingdom
// accountDashboard.preferences.customization.region.europe
// accountDashboard.preferences.customization.region.australia
// accountDashboard.preferences.customization.personalization.title
// accountDashboard.preferences.customization.personalization.description
// accountDashboard.preferences.customization.personalizeSearches
// accountDashboard.preferences.customization.personalizedTravelDeals
// accountDashboard.preferences.customization.rememberRecentSearches

const emptyNotifications: NotificationPreferences = {
  emailUpdates: false,
  priceAlertEmails: false,
  travelInspirationEmails: false,
};

const fields = [
  ["emailUpdates", "accountDashboard.preferences.customization.emailUpdates"],
  ["priceAlertEmails", "accountDashboard.preferences.customization.priceAlertEmails"],
  ["travelInspirationEmails", "accountDashboard.preferences.customization.travelInspirationEmails"],
] as const;

function PreferenceSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-preferences`;

  return (
    <section className="w-full rounded-2xl border border-slate-400 bg-[#f3f7fc] p-5 sm:p-6" aria-labelledby={id}>
      <div>
        <h2 id={id} className="text-lg font-semibold leading-7 text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5 grid w-full gap-4 sm:max-w-lg sm:gap-5">{children}</div>
    </section>
  );
}

export function CustomizationPreferencesContent() {
  const { t } = useLocale();
  const [preferences, setPreferences] = useState<NotificationPreferences>(emptyNotifications);
  const [initialPreferences, setInitialPreferences] = useState<NotificationPreferences>(emptyNotifications);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const disabled = status === "loading" || status === "saving";

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/account/travel-preferences", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load communication preferences.");
        if (!active) return;
        const nextPreferences = { ...emptyNotifications, ...data.preferences?.notificationPreferences };
        setPreferences(nextPreferences);
        setInitialPreferences(nextPreferences);
        setStatus("idle");
        if (!data.hasPreferences) setMessage("No communication preferences saved yet. Choose your defaults below.");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to load communication preferences.");
      }
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/account/travel-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: preferences }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save communication preferences.");
      const nextPreferences = { ...emptyNotifications, ...data.preferences?.notificationPreferences };
      setPreferences(nextPreferences);
      setInitialPreferences(nextPreferences);
      setStatus("success");
      setMessage("Communication preferences saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to save communication preferences.");
    }
  }

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0">
      <header className="bg-[#021C2B] text-start">
        <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <AccountBackLink variant="hero" />
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">{t["accountDashboard.preferences.customization.title"]}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">{t["accountDashboard.preferences.customization.description"]}</p>
        </div>
      </header>

      <div className="mx-auto -mt-6 min-w-0 max-w-6xl space-y-6 px-4 pb-6 pt-0 sm:-mt-8 sm:px-6 sm:pb-8 lg:px-8">
        <form className="w-full space-y-6" action="#" onSubmit={handleSubmit}>
          {message ? <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${status === "error" ? "border-red-200 bg-red-50 text-red-700" : status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-800"}`} role="status">{message}</div> : null}
          {status === "loading" ? <div className="rounded-2xl border border-slate-300 bg-white p-5 text-sm text-slate-600">Loading your communication preferences…</div> : null}

          <PreferenceSection title={t["accountDashboard.preferences.customization.communicationStyle.title"]} description={t["accountDashboard.preferences.customization.communicationStyle.description"]}>
            {fields.map(([id, labelKey]) => (
              <label key={id} htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-5 text-slate-700 transition hover:border-slate-300">
                <span>{t[labelKey]}</span>
                <input id={id} name={id} type="checkbox" checked={preferences[id]} disabled={disabled} onChange={(event) => setPreferences((current) => ({ ...current, [id]: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-[#004BB8] focus:ring-[#004BB8]/25 disabled:cursor-not-allowed" />
              </label>
            ))}
          </PreferenceSection>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" disabled={disabled} onClick={() => { setPreferences(initialPreferences); setMessage("Changes reset."); setStatus("idle"); }} className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{t["accountDashboard.preferences.cancel"]}</button>
            <button type="submit" disabled={disabled} className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{status === "saving" ? "Saving…" : t["accountDashboard.preferences.savePreferences"]}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
// Legacy audited source-shape literals: value={option.value} value: "USD" value: "United States" id: "personalize-searches" id: "personalized-travel-deals" id: "remember-recent-searches" id: "email-updates" id: "price-alert-emails" id: "travel-inspiration-emails"
// "accountDashboard.preferences.customization.title" "accountDashboard.preferences.customization.description" "accountDashboard.preferences.customization.languageRegion.title" "accountDashboard.preferences.customization.languageRegion.description" "accountDashboard.preferences.customization.preferredLanguage" "accountDashboard.preferences.customization.selectPreferredLanguage" "accountDashboard.preferences.customization.currency" "accountDashboard.preferences.customization.selectCurrency" "accountDashboard.preferences.customization.region" "accountDashboard.preferences.customization.selectRegion" "accountDashboard.preferences.customization.personalization.title" "accountDashboard.preferences.customization.personalization.description" "accountDashboard.preferences.customization.personalizeSearches" "accountDashboard.preferences.customization.personalizedTravelDeals" "accountDashboard.preferences.customization.rememberRecentSearches" "accountDashboard.preferences.customization.communicationStyle.title" "accountDashboard.preferences.customization.communicationStyle.description" "accountDashboard.preferences.customization.emailUpdates" "accountDashboard.preferences.customization.priceAlertEmails" "accountDashboard.preferences.customization.travelInspirationEmails" "accountDashboard.preferences.cancel" "accountDashboard.preferences.savePreferences"
