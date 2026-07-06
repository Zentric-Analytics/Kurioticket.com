"use client";

import { useEffect, useState } from "react";
import { Bell, Globe2, Info, MailCheck, MapPinned, Plane, Search, Sparkles } from "lucide-react";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";

const fieldClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#004BB8] focus:ring-4 focus:ring-[#004BB8]/15";

const displayFields = [
  { id: "language", label: "Preferred Language", options: ["English", "Spanish", "French", "German", "Portuguese", "Dutch"] },
  { id: "currency", label: "Currency", options: ["US Dollar (USD)", "Euro (EUR)", "British Pound (GBP)", "Canadian Dollar (CAD)", "Australian Dollar (AUD)"] },
  { id: "region", label: "Region / Market", options: ["United States", "Canada", "United Kingdom", "Europe", "Australia"] },
];

const searchOptions = [
  ["rememberRecentSearches", "Remember recent searches", "Save your recent searches for faster trip planning."],
  ["personalizeSearchResults", "Personalize search results", "Rank search results based on your travel preferences."],
  ["showNearbyAirports", "Show nearby airports", "Include nearby airports when they may provide better value."],
  ["prioritizeFlexibleDates", "Prioritize flexible dates", "Highlight itineraries with better prices when flexible dates are available."],
] as const;

const subscriptions = [
  ["priceAlerts", "Price Alerts", "Receive fare drop notifications for saved searches.", Bell],
  ["tripReminders", "Trip Reminders", "Receive reminders before upcoming trips.", Plane],
  ["savedSearchUpdates", "Saved Search Updates", "Be notified when saved searches have significant price changes.", Search],
  ["travelInspiration", "Travel Inspiration", "Receive destination ideas and seasonal travel recommendations.", Sparkles],
  ["productUpdates", "Product Updates & Offers", "Receive new feature announcements and promotional offers.", MailCheck],
  ["kurioticketNews", "Kurioticket News", "Receive company announcements and important product news.", Globe2],
] as const;

type ToggleKey = (typeof searchOptions)[number][0] | (typeof subscriptions)[number][0] | "unsubscribeAll";

const initialToggles: Record<ToggleKey, boolean> = {
  rememberRecentSearches: true,
  personalizeSearchResults: true,
  showNearbyAirports: true,
  prioritizeFlexibleDates: false,
  priceAlerts: true,
  tripReminders: true,
  savedSearchUpdates: true,
  travelInspiration: false,
  productUpdates: false,
  kurioticketNews: false,
  unsubscribeAll: false,
};

function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${checked ? "bg-[#004BB8]" : "bg-slate-300"}`}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function Section({ icon: Icon, title, description, children, featured = false }: { icon: typeof Globe2; title: string; description: string; children: React.ReactNode; featured?: boolean }) {
  return (
    <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${featured ? "border-[#004BB8]/20 bg-blue-50" : "border-slate-200 bg-white"}`} aria-labelledby={`${title.replace(/\W+/g, "-").toLowerCase()}-title`}>
      <div className="flex gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#004BB8]/10 text-[#004BB8]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 id={`${title.replace(/\W+/g, "-").toLowerCase()}-title`} className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function CustomizationPreferencesContent() {
  const [draft, setDraft] = useState({ language: "English", currency: "US Dollar (USD)", region: "United States" });
  const [saved, setSaved] = useState(draft);
  const [toggles, setToggles] = useState(initialToggles);
  const [savedToggles, setSavedToggles] = useState(initialToggles);
  const [message, setMessage] = useState(false);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(false), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const updateToggle = (key: ToggleKey, value: boolean) => {
    setToggles((current) => key === "unsubscribeAll" && value ? { ...current, unsubscribeAll: true, travelInspiration: false, productUpdates: false, kurioticketNews: false } : { ...current, [key]: value });
  };

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-12">
      <header className="bg-[#021C2B] text-start">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <AccountBackLink variant="hero" />
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">Account preferences</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Display & Notifications</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-blue-50">Choose how Kurioticket personalizes your experience and how you&apos;d like us to contact you.</p>
        </div>
      </header>

      <div className="mx-auto -mt-7 max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); setSaved(draft); setSavedToggles(toggles); setMessage(true); }}>
          <Section icon={Globe2} title="Display Preferences" description="Set regional defaults that make prices, dates, and routes feel local.">
            <div className="grid gap-4 md:grid-cols-3">
              {displayFields.map((field) => (
                <label key={field.id} className="space-y-2 text-sm font-semibold text-slate-700">
                  <span>{field.label}</span>
                  <select value={draft[field.id as keyof typeof draft]} onChange={(event) => setDraft((current) => ({ ...current, [field.id]: event.target.value }))} className={fieldClassName}>
                    {field.options.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </Section>

          <Section icon={MapPinned} title="Search Personalization" description="Tune how Kurioticket ranks flights, airports, and date ideas for your next trip.">
            <div className="grid gap-3 md:grid-cols-2">
              {searchOptions.map(([key, label, helper]) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div><p className="font-semibold text-slate-900">{label}</p><p className="mt-1 text-sm leading-5 text-slate-600">{helper}</p></div>
                  <Switch id={key} checked={toggles[key]} onChange={(value) => updateToggle(key, value)} label={label} />
                </div>
              ))}
            </div>
          </Section>

          <Section icon={Bell} title="Notification Subscriptions" description="Choose the travel updates you want in your inbox.">
            <div className="grid gap-3 lg:grid-cols-2">
              {subscriptions.map(([key, label, helper, Icon]) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#004BB8]/10 text-[#004BB8]"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="font-semibold text-slate-900">{label}</p><p className="mt-1 text-sm leading-5 text-slate-600">{helper}</p></div></div>
                  <Switch id={key} checked={toggles[key]} onChange={(value) => updateToggle(key, value)} label={label} />
                </div>
              ))}
            </div>
          </Section>

          <Section icon={MailCheck} title="Unsubscribe from all optional emails" description="Turn off all promotional and optional emails with one switch." featured>
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-lg font-semibold text-slate-950">Optional email subscriptions</p><p className="mt-1 text-sm text-slate-600">Use this as a global preference for non-essential email.</p></div>
              <Switch id="unsubscribeAll" checked={toggles.unsubscribeAll} onChange={(value) => updateToggle("unsubscribeAll", value)} label="Unsubscribe from all optional emails" />
            </div>
            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><p>Important account, security, support and booking-related emails will still be delivered.</p></div>
          </Section>

          {message && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Preferences saved for this session.</div>}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setDraft(saved); setToggles(savedToggles); }} className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">Cancel</button>
            <button type="submit" className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] sm:w-auto">Save Preferences</button>
          </div>
        </form>
      </div>
    </main>
  );
}
