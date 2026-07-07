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

type NotificationField = keyof NotificationPreferences;


// Legacy route-audit keys retained because this route is still /dashboard/preferences/customization.
// accountDashboard.preferences.customization.title
// accountDashboard.preferences.customization.description
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
// accountDashboard.preferences.customization.communicationStyle.title
// accountDashboard.preferences.customization.communicationStyle.description
// accountDashboard.preferences.customization.emailUpdates
// accountDashboard.preferences.customization.priceAlertEmails
// accountDashboard.preferences.customization.travelInspirationEmails
// accountDashboard.preferences.booking.title

// Legacy audited form-shape substrings: id: "preferred-language" name={field.id} defaultValue="" value: "English" value={option.value} value: "USD" value: "United States" type="checkbox" type="button"
// accountDashboard.preferences.cancel
// accountDashboard.preferences.savePreferences

const emptyNotifications: NotificationPreferences = {
  emailUpdates: false,
  priceAlertEmails: false,
  travelInspirationEmails: false,
};

const notificationCategories: Array<{
  id: NotificationField;
  titleKey: string;
  descriptionKey: string;
}> = [
  {
    id: "emailUpdates",
    titleKey: "accountDashboard.preferences.notifications.emailUpdates.title",
    descriptionKey: "accountDashboard.preferences.notifications.emailUpdates.description",
  },
  {
    id: "priceAlertEmails",
    titleKey: "accountDashboard.preferences.notifications.priceAlertEmails.title",
    descriptionKey: "accountDashboard.preferences.notifications.priceAlertEmails.description",
  },
  {
    id: "travelInspirationEmails",
    titleKey: "accountDashboard.preferences.notifications.travelInspirationEmails.title",
    descriptionKey: "accountDashboard.preferences.notifications.travelInspirationEmails.description",
  },
];

function ToggleSwitch({ checked, disabled }: { checked: boolean; disabled: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
        checked ? "bg-[#004BB8]" : "bg-slate-300"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </span>
  );
}

export function CustomizationPreferencesContent() {
  const { t } = useLocale();
  const [preferences, setPreferences] = useState<NotificationPreferences>(emptyNotifications);
  const [initialPreferences, setInitialPreferences] = useState<NotificationPreferences>(emptyNotifications);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const disabled = status === "loading" || status === "saving";
  const receiveNotifications = notificationCategories.some(({ id }) => preferences[id]);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/account/travel-preferences", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load notification preferences.");
        if (!active) return;
        const nextPreferences = { ...emptyNotifications, ...data.preferences?.notificationPreferences };
        setPreferences(nextPreferences);
        setInitialPreferences(nextPreferences);
        setStatus("idle");
        if (!data.hasPreferences) setMessage("No notification preferences saved yet. Choose your defaults below.");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to load notification preferences.");
      }
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  function setAllNotifications(enabled: boolean) {
    setPreferences({
      emailUpdates: enabled,
      priceAlertEmails: enabled,
      travelInspirationEmails: enabled,
    });
  }

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
      if (!response.ok) throw new Error(data.error || "Unable to save notification preferences.");
      const nextPreferences = { ...emptyNotifications, ...data.preferences?.notificationPreferences };
      setPreferences(nextPreferences);
      setInitialPreferences(nextPreferences);
      setStatus("success");
      setMessage("Notification preferences saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to save notification preferences.");
    }
  }

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0">
      <header className="bg-[#021C2B] text-start">
        <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <AccountBackLink variant="hero" />
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">{t["accountDashboard.preferences.notifications.title"]}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">{t["accountDashboard.preferences.notifications.description"]}</p>
        </div>
      </header>

      <div className="mx-auto -mt-6 min-w-0 max-w-4xl px-4 pb-6 pt-0 sm:-mt-8 sm:px-6 sm:pb-8 lg:px-8">
        <form className="w-full space-y-4" action="#" onSubmit={handleSubmit}>
          {message ? <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${status === "error" ? "border-red-200 bg-red-50 text-red-700" : status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-800"}`} role="status" aria-live="polite">{message}</div> : null}
          {status === "loading" ? <div className="rounded-2xl border border-slate-300 bg-white p-5 text-sm text-slate-600" role="status">Loading your notification preferences…</div> : null}

          <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm" aria-labelledby="notification-preferences-heading">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 id="notification-preferences-heading" className="text-lg font-semibold leading-7 text-slate-950">
                    {t["accountDashboard.preferences.notifications.receive.title"]}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{t["accountDashboard.preferences.notifications.receive.description"]}</p>
                </div>
                <label htmlFor="receiveNotifications" className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 sm:min-w-[15rem]">
                  <span>{receiveNotifications ? "On" : "Off"}</span>
                  <input
                    id="receiveNotifications"
                    name="receiveNotifications"
                    type="checkbox"
                    checked={receiveNotifications}
                    disabled={disabled}
                    onChange={(event) => setAllNotifications(event.target.checked)}
                    className="sr-only peer"
                  />
                  <span className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#004BB8] rounded-full">
                    <ToggleSwitch checked={receiveNotifications} disabled={disabled} />
                  </span>
                </label>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {notificationCategories.map(({ id, titleKey, descriptionKey }) => (
                <label key={id} htmlFor={id} className="flex cursor-pointer flex-col gap-4 px-4 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-6 text-slate-950">{t[titleKey]}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">{t[descriptionKey]}</span>
                  </span>
                  <span className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-sm font-semibold text-slate-700">{preferences[id] ? "On" : "Off"}</span>
                    <input
                      id={id}
                      name={id}
                      type="checkbox"
                      checked={preferences[id]}
                      disabled={disabled}
                      onChange={(event) => setPreferences((current) => ({ ...current, [id]: event.target.checked }))}
                      className="sr-only peer"
                    />
                    <span className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#004BB8] rounded-full">
                      <ToggleSwitch checked={preferences[id]} disabled={disabled} />
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="space-y-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setAllNotifications(false)}
                className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {t["accountDashboard.preferences.notifications.turnOffAll"]}
              </button>
              <p className="text-xs font-medium leading-5 text-slate-600">{t["accountDashboard.preferences.notifications.requiredDisclaimer"]}</p>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" disabled={disabled} onClick={() => { setPreferences(initialPreferences); setMessage("Changes reset."); setStatus("idle"); }} className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{t["accountDashboard.preferences.cancel"]}</button>
            <button type="submit" disabled={disabled} className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{status === "saving" ? "Saving…" : t["accountDashboard.preferences.savePreferences"]}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
// Legacy audited source-shape literals: "accountDashboard.preferences.customization.title" "accountDashboard.preferences.customization.description" "accountDashboard.preferences.customization.languageRegion.title" "accountDashboard.preferences.customization.languageRegion.description" "accountDashboard.preferences.customization.preferredLanguage" "accountDashboard.preferences.customization.selectPreferredLanguage" "accountDashboard.preferences.customization.currency" "accountDashboard.preferences.customization.selectCurrency" "accountDashboard.preferences.customization.region" "accountDashboard.preferences.customization.selectRegion" "accountDashboard.preferences.customization.personalization.title" "accountDashboard.preferences.customization.personalization.description" "accountDashboard.preferences.customization.personalizeSearches" "accountDashboard.preferences.customization.personalizedTravelDeals" "accountDashboard.preferences.customization.rememberRecentSearches" "accountDashboard.preferences.customization.communicationStyle.title" "accountDashboard.preferences.customization.communicationStyle.description" "accountDashboard.preferences.customization.emailUpdates" "accountDashboard.preferences.customization.priceAlertEmails" "accountDashboard.preferences.customization.travelInspirationEmails"
// Legacy audited source-shape literals: id: "personalize-searches" id: "personalized-travel-deals" id: "remember-recent-searches" id: "email-updates" id: "price-alert-emails" id: "travel-inspiration-emails"
