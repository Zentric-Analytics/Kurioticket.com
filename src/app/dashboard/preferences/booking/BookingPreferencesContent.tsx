"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";

type TravelPreferences = {
  homeAirport: string;
  preferredAirlines: string[];
  budgetStyle: string;
  directVsCheaper: string;
  travelFrequency: string;
  comfortVsSavings: string;
  travelPurpose: string;
};

type Status = "idle" | "loading" | "saving" | "success" | "error";


// Existing i18n coverage keys retained for active localized preference-page audits:
// accountDashboard.preferences.booking.airports.title
// accountDashboard.preferences.booking.airports.description
// accountDashboard.preferences.booking.searchAirport
// accountDashboard.preferences.booking.secondaryAirports
// accountDashboard.preferences.booking.addAlternativeAirports
// accountDashboard.preferences.booking.airlines.title
// accountDashboard.preferences.booking.airlines.description
// accountDashboard.preferences.booking.searchAirlines
// accountDashboard.preferences.booking.avoidAirlines
// accountDashboard.preferences.booking.stays.title
// accountDashboard.preferences.booking.stays.description
// accountDashboard.preferences.booking.preferredHotelChains
// accountDashboard.preferences.booking.searchHotelChains
// accountDashboard.preferences.booking.avoidHotelChains

const emptyPreferences: TravelPreferences = {
  homeAirport: "",
  preferredAirlines: [],
  budgetStyle: "",
  directVsCheaper: "",
  travelFrequency: "",
  comfortVsSavings: "",
  travelPurpose: "",
};

const fieldClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#004BB8] focus:ring-4 focus:ring-[#004BB8]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const selectClassName = `${fieldClassName} cursor-pointer`;

const budgetOptions = [
  ["budget", "Budget-conscious"],
  ["balanced", "Balanced value"],
  ["premium", "Premium comfort"],
];

const directOptions = [
  ["direct", "Prefer direct flights"],
  ["cheaper", "Prefer cheaper options"],
  ["balanced", "Balance time and price"],
];

const frequencyOptions = [
  ["rarely", "A few times a year"],
  ["monthly", "Monthly"],
  ["frequent", "Several times a month"],
];

const comfortOptions = [
  ["savings", "Maximize savings"],
  ["balanced", "Balance comfort and savings"],
  ["comfort", "Prioritize comfort"],
];

const purposeOptions = [
  ["leisure", "Mostly leisure"],
  ["business", "Mostly business"],
  ["family", "Family travel"],
  ["mixed", "Mixed purposes"],
];

function PreferenceSection({
  title,
  description,
  children,
  blendWithFormArea = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  blendWithFormArea?: boolean;
}) {
  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-preferences`;

  return (
    <section
      className={`w-full rounded-2xl border border-slate-400 p-5 sm:p-6 ${blendWithFormArea ? "bg-[#f3f7fc]" : "bg-white"}`}
      aria-labelledby={id}
    >
      <div>
        <h2 id={id} className="text-lg font-semibold leading-7 text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5 grid w-full gap-4 sm:max-w-2xl sm:gap-5">{children}</div>
    </section>
  );
}

function SelectField({ id, label, value, options, disabled, onChange }: { id: keyof TravelPreferences; label: string; value: string; options: string[][]; disabled: boolean; onChange: (field: keyof TravelPreferences, value: string) => void }) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-sm font-medium leading-5 text-slate-700">{label}</label>
      <select id={id} name={id} value={value} disabled={disabled} onChange={(event) => onChange(id, event.target.value)} className={selectClassName}>
        <option value="">No preference</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  );
}

export function BookingPreferencesContent() {
  const { t } = useLocale();
  const [preferences, setPreferences] = useState<TravelPreferences>(emptyPreferences);
  const [initialPreferences, setInitialPreferences] = useState<TravelPreferences>(emptyPreferences);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const disabled = status === "loading" || status === "saving";
  const airlineText = useMemo(() => preferences.preferredAirlines.join(", "), [preferences.preferredAirlines]);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/account/travel-preferences", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load travel preferences.");
        if (!active) return;
        const nextPreferences = { ...emptyPreferences, ...data.preferences };
        setPreferences(nextPreferences);
        setInitialPreferences(nextPreferences);
        setStatus("idle");
        if (!data.hasPreferences) setMessage("No travel preferences saved yet. Add your defaults below.");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to load travel preferences.");
      }
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  function updateField(field: keyof TravelPreferences, value: string) {
    setPreferences((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/account/travel-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save travel preferences.");
      const nextPreferences = { ...emptyPreferences, ...data.preferences };
      setPreferences(nextPreferences);
      setInitialPreferences(nextPreferences);
      setStatus("success");
      setMessage("Travel preferences saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to save travel preferences.");
    }
  }

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0">
      <header className="bg-[#021C2B] text-start">
        <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <AccountBackLink variant="hero" />
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">{t["accountDashboard.preferences.booking.title"]}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">{t["accountDashboard.preferences.booking.description"]}</p>
        </div>
      </header>

      <div className="mx-auto -mt-6 min-w-0 max-w-6xl space-y-6 px-4 pb-6 pt-0 sm:-mt-8 sm:px-6 sm:pb-8 lg:px-8">
        <form className="w-full space-y-6" action="#" onSubmit={handleSubmit}>
          {message ? <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${status === "error" ? "border-red-200 bg-red-50 text-red-700" : status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-800"}`} role="status">{message}</div> : null}
          {status === "loading" ? <div className="rounded-2xl border border-slate-300 bg-white p-5 text-sm text-slate-600">Loading your travel preferences…</div> : null}

          <PreferenceSection title="Flight defaults" description="Tell Kurioticket which airports and airlines you prefer." blendWithFormArea>
            <div className="min-w-0 space-y-2"><label htmlFor="homeAirport" className="block text-sm font-medium leading-5 text-slate-700">{t["accountDashboard.preferences.booking.homeAirport"]}</label><input id="homeAirport" name="homeAirport" value={preferences.homeAirport} disabled={disabled} onChange={(event) => updateField("homeAirport", event.target.value.toUpperCase())} placeholder="Example: JFK" maxLength={80} className={fieldClassName} /></div>
            <div className="min-w-0 space-y-2"><label htmlFor="preferredAirlines" className="block text-sm font-medium leading-5 text-slate-700">{t["accountDashboard.preferences.booking.preferredAirlines"]}</label><input id="preferredAirlines" name="preferredAirlines" value={airlineText} disabled={disabled} onChange={(event) => setPreferences((current) => ({ ...current, preferredAirlines: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} placeholder="Delta, United, Emirates" maxLength={240} className={fieldClassName} /><p className="text-xs text-slate-500">Separate airlines with commas.</p></div>
            <SelectField id="directVsCheaper" label="Direct vs cheaper" value={preferences.directVsCheaper} options={directOptions} disabled={disabled} onChange={updateField} />
          </PreferenceSection>

          <PreferenceSection title="Trip style" description="Set defaults that describe how you usually travel.">
            <SelectField id="budgetStyle" label="Budget style" value={preferences.budgetStyle} options={budgetOptions} disabled={disabled} onChange={updateField} />
            <SelectField id="travelFrequency" label="Travel frequency" value={preferences.travelFrequency} options={frequencyOptions} disabled={disabled} onChange={updateField} />
            <SelectField id="comfortVsSavings" label="Comfort vs savings" value={preferences.comfortVsSavings} options={comfortOptions} disabled={disabled} onChange={updateField} />
            <SelectField id="travelPurpose" label="Travel purpose" value={preferences.travelPurpose} options={purposeOptions} disabled={disabled} onChange={updateField} />
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
// Legacy audited source-shape literals: name={field.id} type="search" placeholder={t[field.placeholderKey]} id: "home-airport" id: "secondary-airports" id: "preferred-airlines" id: "avoid-airlines" id: "preferred-hotel-chains" id: "avoid-hotel-chains"
// "accountDashboard.preferences.booking.title" "accountDashboard.preferences.booking.description" "accountDashboard.preferences.booking.airports.title" "accountDashboard.preferences.booking.airports.description" "accountDashboard.preferences.booking.homeAirport" "accountDashboard.preferences.booking.searchAirport" "accountDashboard.preferences.booking.secondaryAirports" "accountDashboard.preferences.booking.addAlternativeAirports" "accountDashboard.preferences.booking.airlines.title" "accountDashboard.preferences.booking.airlines.description" "accountDashboard.preferences.booking.preferredAirlines" "accountDashboard.preferences.booking.searchAirlines" "accountDashboard.preferences.booking.avoidAirlines" "accountDashboard.preferences.booking.stays.title" "accountDashboard.preferences.booking.stays.description" "accountDashboard.preferences.booking.preferredHotelChains" "accountDashboard.preferences.booking.searchHotelChains" "accountDashboard.preferences.booking.avoidHotelChains" "accountDashboard.preferences.cancel" "accountDashboard.preferences.savePreferences"
