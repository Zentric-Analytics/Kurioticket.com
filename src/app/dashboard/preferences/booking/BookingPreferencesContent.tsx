"use client";

import { useEffect, useState } from "react";
import { BedDouble, Car, Plane, Users } from "lucide-react";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";

const fieldClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#004BB8] focus:ring-4 focus:ring-[#004BB8]/15";

const travelProfile = [
  { id: "travelFor", label: "I mostly travel for", options: ["Leisure", "Business", "Both"] },
  { id: "travelScope", label: "I usually travel", options: ["Domestic", "International", "Both"] },
  { id: "travelWith", label: "I usually travel", options: ["Solo", "Couple", "Family", "Group"] },
];

const selectFields = [
  { id: "preferredCabin", label: "Preferred Cabin", options: ["Economy", "Premium Economy", "Business", "First"] },
  { id: "stopsPreference", label: "Stops Preference", options: ["Show all", "Prefer nonstop", "Nonstop only"] },
  { id: "baggagePreference", label: "Baggage Preference", options: ["No preference", "Carry-on included", "Checked bag included"] },
  { id: "departureTime", label: "Preferred Departure Time", options: ["Morning", "Afternoon", "Evening", "Overnight"] },
  { id: "seatPreference", label: "Seat Preference", options: ["Window", "Aisle", "No preference"] },
  { id: "maximumLayover", label: "Maximum Layover", options: ["No preference", "Up to 2 hours", "Up to 4 hours", "Avoid long layovers"] },
];

const hotelAmenities = ["Wi-Fi", "Airport shuttle", "Parking", "Gym", "Pool", "Family-friendly"];
const toggles = ["Avoid overnight layovers", "Free cancellation preferred", "Breakfast included", "Pay at property", "Unlimited mileage", "Free cancellation"];

type FormState = Record<string, string>;
type ToggleState = Record<string, boolean>;

const initialForm: FormState = {
  travelFor: "Leisure", travelScope: "Domestic", travelWith: "Solo", homeAirport: "", nearbyAirports: "", preferredCabin: "Economy", stopsPreference: "Show all", baggagePreference: "No preference", departureTime: "Morning", seatPreference: "No preference", maximumLayover: "No preference", preferredHotelChains: "", avoidHotelChains: "", starRating: "Any", vehicleType: "Economy", pickupPreference: "No Preference",
};
const initialToggles: ToggleState = Object.fromEntries([...toggles, ...hotelAmenities].map((item) => [item, false]));

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${checked ? "bg-[#004BB8]" : "bg-slate-300"}`}><span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "translate-x-6" : "translate-x-1"}`} /></button>;
}

function Section({ icon: Icon, title, description, children }: { icon: typeof Plane; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby={`${title.replace(/\W+/g, "-").toLowerCase()}-title`}><div className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#004BB8]/10 text-[#004BB8]"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><h2 id={`${title.replace(/\W+/g, "-").toLowerCase()}-title`} className="text-xl font-semibold text-slate-950">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div></div><div className="mt-6">{children}</div></section>;
}

function SelectField({ id, label, options, form, setForm }: { id: string; label: string; options: string[]; form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return <label className="space-y-2 text-sm font-semibold text-slate-700"><span>{label}</span><select value={form[id]} onChange={(event) => setForm((current) => ({ ...current, [id]: event.target.value }))} className={fieldClassName}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function TextField({ id, label, placeholder, form, setForm }: { id: string; label: string; placeholder: string; form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return <label className="space-y-2 text-sm font-semibold text-slate-700"><span>{label}</span><input value={form[id]} onChange={(event) => setForm((current) => ({ ...current, [id]: event.target.value }))} type="text" placeholder={placeholder} className={fieldClassName} /></label>;
}

export function BookingPreferencesContent() {
  const [form, setForm] = useState(initialForm);
  const [savedForm, setSavedForm] = useState(initialForm);
  const [toggleState, setToggleState] = useState(initialToggles);
  const [savedToggles, setSavedToggles] = useState(initialToggles);
  const [message, setMessage] = useState(false);

  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(false), 3200); return () => window.clearTimeout(timer); }, [message]);
  const setToggle = (label: string, checked: boolean) => setToggleState((current) => ({ ...current, [label]: checked }));

  return <main className="flex-1 bg-[#f3f7fc] pb-12"><header className="bg-[#021C2B] text-start"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14"><AccountBackLink variant="hero" /><p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">Personalization</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Travel Preferences</h1><p className="mt-4 max-w-3xl text-base leading-7 text-blue-50">Tell us how you like to travel so we can personalize your search experience.</p></div></header><div className="mx-auto -mt-7 max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8"><form className="space-y-6" onSubmit={(event) => { event.preventDefault(); setSavedForm(form); setSavedToggles(toggleState); setMessage(true); }}>
    <Section icon={Users} title="Travel Profile" description="These preferences are only for personalization."><div className="grid gap-4 md:grid-cols-3">{travelProfile.map((field) => <SelectField key={field.id} {...field} form={form} setForm={setForm} />)}</div></Section>
    <Section icon={Plane} title="Flight Preferences" description="Shape flight results around your airports, cabin, timing, stops, baggage, and layover comfort."><div className="grid gap-4 md:grid-cols-2"><TextField id="homeAirport" label="Home Airport" placeholder="Search airport or city" form={form} setForm={setForm} /><TextField id="nearbyAirports" label="Nearby Airports" placeholder="Add nearby alternatives" form={form} setForm={setForm} />{selectFields.map((field) => <SelectField key={field.id} {...field} form={form} setForm={setForm} />)}<div className="md:col-span-2"><div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div><p className="font-semibold text-slate-900">Avoid overnight layovers</p><p className="mt-1 text-sm text-slate-600">Keep long connections out of your preferred results.</p></div><Switch checked={toggleState["Avoid overnight layovers"]} onChange={(value) => setToggle("Avoid overnight layovers", value)} label="Avoid overnight layovers" /></div></div></div></Section>
    <Section icon={BedDouble} title="Hotel Preferences" description="Prioritize the stays, policies, ratings, and amenities that matter most."><div className="grid gap-4 md:grid-cols-2"><TextField id="preferredHotelChains" label="Preferred hotel chains" placeholder="Hilton, Marriott, Hyatt" form={form} setForm={setForm} /><TextField id="avoidHotelChains" label="Hotel chains to avoid" placeholder="Add chains to avoid" form={form} setForm={setForm} /><SelectField id="starRating" label="Preferred star rating" options={["Any", "3★", "4★", "5★"]} form={form} setForm={setForm} /></div><div className="mt-5 grid gap-3 md:grid-cols-3">{["Free cancellation preferred", "Breakfast included", "Pay at property"].map((label) => <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="font-semibold text-slate-900">{label}</span><Switch checked={toggleState[label]} onChange={(value) => setToggle(label, value)} label={label} /></div>)}</div><fieldset className="mt-5 rounded-2xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-700">Amenities checklist</legend><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{hotelAmenities.map((item) => <label key={item} className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={toggleState[item]} onChange={(event) => setToggle(item, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#004BB8] focus:ring-[#004BB8]/25" />{item}</label>)}</div></fieldset></Section>
    <Section icon={Car} title="Car Preferences" description="Set rental car defaults for vehicle class, pickup location, and flexible policies."><div className="grid gap-4 md:grid-cols-2"><SelectField id="vehicleType" label="Vehicle Type" options={["Economy", "Compact", "SUV", "Premium", "Van"]} form={form} setForm={setForm} /><SelectField id="pickupPreference" label="Pickup Preference" options={["Airport", "City Center", "No Preference"]} form={form} setForm={setForm} /></div><div className="mt-5 grid gap-3 md:grid-cols-2">{["Unlimited mileage", "Free cancellation"].map((label) => <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="font-semibold text-slate-900">{label}</span><Switch checked={toggleState[label]} onChange={(value) => setToggle(label, value)} label={label} /></div>)}</div></Section>
    {message && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Preferences saved for this session.</div>}
    <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setForm(savedForm); setToggleState(savedToggles); }} className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">Cancel</button><button type="submit" className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] sm:w-auto">Save Preferences</button></div>
  </form></div></main>;
}
