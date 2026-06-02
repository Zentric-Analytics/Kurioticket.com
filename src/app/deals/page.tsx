"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type PackageMode = "flight-hotel" | "flight-hotel-car" | "flight-car" | "hotel-car";

type PackageValues = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: string;
  children: string;
  infants: string;
  rooms: string;
  cabinClass: string;
  driverAge: string;
};

const packageModes: Array<{
  id: PackageMode;
  label: string;
  description: string;
  includesFlight: boolean;
  includesHotel: boolean;
  includesCar: boolean;
}> = [
  {
    id: "flight-hotel",
    label: "Flight + Hotel",
    description: "Air and stay",
    includesFlight: true,
    includesHotel: true,
    includesCar: false,
  },
  {
    id: "flight-hotel-car",
    label: "Flight + Hotel + Car",
    description: "Complete trip search",
    includesFlight: true,
    includesHotel: true,
    includesCar: true,
  },
  {
    id: "flight-car",
    label: "Flight + Car",
    description: "Air and pickup",
    includesFlight: true,
    includesHotel: false,
    includesCar: true,
  },
  {
    id: "hotel-car",
    label: "Hotel + Car",
    description: "Stay and pickup",
    includesFlight: false,
    includesHotel: true,
    includesCar: true,
  },
];

const cabinClasses = [
  { value: "economy", label: "Economy" },
  { value: "premium-economy", label: "Premium economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const driverAgeOptions = [
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "40",
  "45",
  "50",
  "55",
  "60",
  "65",
  "70",
  "75",
].map((age) => ({ value: age, label: age }));

const initialPackageValues: PackageValues = {
  origin: "",
  destination: "",
  startDate: "",
  endDate: "",
  adults: "1",
  children: "0",
  infants: "0",
  rooms: "1",
  cabinClass: "economy",
  driverAge: "30",
};

const searchStarters = [
  {
    route: "Houston → Tokyo",
    note: "Long-haul route idea for flexible international planning",
    href: "/flights/results?origin=Houston&destination=Tokyo",
  },
  {
    route: "New York → London",
    note: "Transatlantic search starter for comparing cabins and schedules",
    href: "/flights/results?origin=New%20York&destination=London",
  },
  {
    route: "Chicago → Cancun",
    note: "Warm-weather route idea for date-flexible searches",
    href: "/flights/results?origin=Chicago&destination=Cancun",
  },
  {
    route: "Los Angeles → Mexico City",
    note: "Regional international route starter for provider comparison",
    href: "/flights/results?origin=Los%20Angeles&destination=Mexico%20City",
  },
];

const copy = {
  en: {
    eyebrow: "Kurioticket planning",
    title: "Search travel deals your way",
    subtitle: "Build your trip search around flights, stays, and cars.",
    formTitle: "Build a package-style search",
    formSubtitle: "Choose the trip parts you need, then continue into the safest matching Kurioticket results flow.",
    modeLegend: "Choose trip parts",
    originLabel: "Leaving from",
    destinationLabel: "Going to",
    startDateLabel: "Departure / check-in",
    endDateLabel: "Return / check-out",
    adultsLabel: "Adults",
    childrenLabel: "Children",
    infantsLabel: "Infants",
    roomsLabel: "Rooms",
    cabinLabel: "Cabin class",
    driverAgeLabel: "Driver age",
    submitLabel: "Search",
    helperFlight: "Flight-inclusive searches continue to flight results with your package mode attached.",
    helperHotel: "Hotel + Car searches continue to hotel results so the stay search stays accurate.",
    sections: [
      {
        title: "Choose your trip parts first",
        text: "Start with flights, stays, and cars in the combination that fits your plans.",
      },
      {
        title: "Continue into trusted search flows",
        text: "Kurioticket routes your details to existing flight or hotel results instead of creating unsupported package listings.",
      },
      {
        title: "Keep details easy to adjust",
        text: "Dates, travelers, rooms, and cabin choices stay clear so you can refine your trip after searching.",
      },
      {
        title: "Provider-neutral by design",
        text: "This page focuses on search entry and avoids unsupported package claims.",
      },
    ],
    startersTitle: "Try these search starters",
    startersSubtitle: "Route ideas without displayed fares. Select one to begin a flight search and compare provider results.",
    cta: "Search route",
  },
  fr: {
    eyebrow: "Planification Kurioticket",
    title: "Recherchez vos offres voyage à votre façon",
    subtitle: "Construisez votre recherche autour des vols, séjours et voitures.",
    formTitle: "Créer une recherche de voyage combinée",
    formSubtitle: "Choisissez les éléments du voyage, puis continuez vers le flux de résultats Kurioticket le plus adapté.",
    modeLegend: "Choisir les éléments du voyage",
    originLabel: "Départ de",
    destinationLabel: "Destination",
    startDateLabel: "Départ / arrivée",
    endDateLabel: "Retour / départ",
    adultsLabel: "Adultes",
    childrenLabel: "Enfants",
    infantsLabel: "Bébés",
    roomsLabel: "Chambres",
    cabinLabel: "Classe cabine",
    driverAgeLabel: "Âge du conducteur",
    submitLabel: "Rechercher",
    helperFlight: "Les recherches avec vol continuent vers les résultats de vols avec le mode de voyage indiqué.",
    helperHotel: "Les recherches Hôtel + Voiture continuent vers les résultats d’hôtels pour garder la recherche de séjour précise.",
    sections: [
      {
        title: "Choisissez d’abord les éléments du voyage",
        text: "Commencez avec les vols, séjours et voitures dans la combinaison adaptée à vos plans.",
      },
      {
        title: "Continuez vers les flux de recherche existants",
        text: "Kurioticket envoie vos détails vers les résultats de vols ou d’hôtels au lieu de créer des listes de forfaits non prises en charge.",
      },
      {
        title: "Gardez des détails simples à ajuster",
        text: "Dates, voyageurs, chambres et cabine restent clairs pour affiner votre voyage après la recherche.",
      },
      {
        title: "Neutre par conception",
        text: "Cette page se concentre sur l’entrée de recherche et évite les promesses de forfait non prises en charge.",
      },
    ],
    startersTitle: "Essayez ces points de départ",
    startersSubtitle: "Des idées d’itinéraires sans tarifs affichés. Sélectionnez-en une pour lancer une recherche de vol et comparer les résultats des fournisseurs.",
    cta: "Rechercher l’itinéraire",
  },
};

const fieldClass =
  "mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15";
const labelClass = "text-sm font-black text-slate-800";
const helpClass = "text-sm font-semibold leading-6 text-slate-600";

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const todayIso = () => toIsoDate(new Date());

const clampInteger = (value: string, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) return min;

  return Math.min(max, Math.max(min, parsed));
};

const isDateBeforeToday = (date: string, minimumDate: string) => Boolean(date) && date < minimumDate;

function DealsTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  type = "text",
  min,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  type?: "text" | "date" | "number";
  min?: string | number;
  inputMode?: "numeric";
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className={labelClass}>{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        min={min}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={fieldClass}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function DealsSelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className={labelClass}>{label}</span>
      <select
        id={id}
        name={id}
        value={value}
        className={fieldClass}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DealsPackageSearchForm({ dictionary }: { dictionary: (typeof copy)["en"] }) {
  const router = useRouter();
  const minDate = useMemo(() => todayIso(), []);
  const [packageMode, setPackageMode] = useState<PackageMode>("flight-hotel");
  const [values, setValues] = useState<PackageValues>(initialPackageValues);
  const [error, setError] = useState("");

  const selectedMode = packageModes.find((mode) => mode.id === packageMode) ?? packageModes[0];
  const includesFlight = selectedMode.includesFlight;
  const includesHotel = selectedMode.includesHotel;
  const includesCar = selectedMode.includesCar;

  const updateValue = <Key extends keyof PackageValues>(key: Key, value: PackageValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const selectPackageMode = (nextMode: PackageMode) => {
    setPackageMode(nextMode);
    setError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const origin = values.origin.trim();
    const destination = values.destination.trim();
    const adults = clampInteger(values.adults, 1, 9);
    const children = clampInteger(values.children, 0, Math.max(0, 9 - adults));
    const infants = clampInteger(values.infants, 0, Math.min(adults, Math.max(0, 9 - adults - children)));
    const rooms = clampInteger(values.rooms, 1, 6);
    const driverAge = clampInteger(values.driverAge, 18, 75);
    const travelers = adults + children + infants;

    setValues((current) => ({
      ...current,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      rooms: String(rooms),
      driverAge: String(driverAge),
    }));

    if (includesFlight && !origin) {
      setError("Enter where your flight starts.");
      return;
    }

    if (!destination) {
      setError("Enter where you are going.");
      return;
    }

    if (!values.startDate) {
      setError("Select a departure or check-in date.");
      return;
    }

    if (!values.endDate) {
      setError("Select a return or check-out date.");
      return;
    }

    if (isDateBeforeToday(values.startDate, minDate) || isDateBeforeToday(values.endDate, minDate)) {
      setError("Dates cannot be in the past.");
      return;
    }

    if (values.endDate <= values.startDate) {
      setError("Return or check-out date must be after the start date.");
      return;
    }

    if (includesFlight) {
      const params = new URLSearchParams({
        tripType: "round-trip",
        origin,
        destination,
        departureDate: values.startDate,
        returnDate: values.endDate,
        adults: String(adults),
        children: String(children),
        infants: String(infants),
        travelers: String(travelers),
        cabinClass: values.cabinClass,
        packageMode,
      });

      if (includesHotel) {
        params.set("rooms", String(rooms));
      }

      if (includesCar) {
        params.set("driverAge", String(driverAge));
      }

      router.push(`/flights/results?${params.toString()}`);
      return;
    }

    const params = new URLSearchParams({
      destination,
      checkIn: values.startDate,
      checkOut: values.endDate,
      guests: String(Math.max(1, adults + children)),
      rooms: String(rooms),
      packageMode,
    });

    if (includesCar) {
      params.set("driverAge", String(driverAge));
    }

    router.push(`/hotels/results?${params.toString()}`);
  };

  return (
    <form
      className="relative z-10 rounded-[2rem] border border-white/70 bg-white/95 p-4 shadow-[0_34px_100px_-45px_rgba(30,41,59,0.9)] backdrop-blur sm:p-6 lg:p-7"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600">Package search</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-indigo-950 sm:text-3xl">
            {dictionary.formTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            {dictionary.formSubtitle}
          </p>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="sr-only">{dictionary.modeLegend}</legend>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label={dictionary.modeLegend}>
          {packageModes.map((mode) => {
            const isSelected = packageMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={isSelected}
                className={`rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50"
                }`}
                onClick={() => selectPackageMode(mode.id)}
              >
                <span className="block text-sm font-black">{mode.label}</span>
                <span className={`mt-1 block text-xs font-bold ${isSelected ? "text-indigo-100" : "text-slate-500"}`}>
                  {mode.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div aria-live="polite" className="mt-4 min-h-6">
        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-2 grid gap-4 lg:grid-cols-12">
        {includesFlight ? (
          <div className="lg:col-span-3">
            <DealsTextField
              id="deals-origin"
              label={dictionary.originLabel}
              value={values.origin}
              placeholder="City or airport"
              autoComplete="off"
              onChange={(value) => updateValue("origin", value)}
            />
          </div>
        ) : null}

        <div className={includesFlight ? "lg:col-span-3" : "lg:col-span-4"}>
          <DealsTextField
            id="deals-destination"
            label={dictionary.destinationLabel}
            value={values.destination}
            placeholder="City, airport, or area"
            autoComplete="off"
            onChange={(value) => updateValue("destination", value)}
          />
        </div>

        <div className="sm:grid sm:grid-cols-2 sm:gap-4 lg:col-span-4">
          <DealsTextField
            id="deals-start-date"
            label={dictionary.startDateLabel}
            type="date"
            min={minDate}
            value={values.startDate}
            onChange={(value) => updateValue("startDate", value)}
          />
          <div className="mt-4 sm:mt-0">
            <DealsTextField
              id="deals-end-date"
              label={dictionary.endDateLabel}
              type="date"
              min={values.startDate || minDate}
              value={values.endDate}
              onChange={(value) => updateValue("endDate", value)}
            />
          </div>
        </div>

        <div className={includesFlight ? "lg:col-span-2" : "lg:col-span-4"}>
          <DealsTextField
            id="deals-adults"
            label={dictionary.adultsLabel}
            type="number"
            min={1}
            inputMode="numeric"
            value={values.adults}
            onChange={(value) => updateValue("adults", value)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-2">
          <DealsTextField
            id="deals-children"
            label={dictionary.childrenLabel}
            type="number"
            min={0}
            inputMode="numeric"
            value={values.children}
            onChange={(value) => updateValue("children", value)}
          />
        </div>

        {includesFlight ? (
          <>
            <div className="lg:col-span-2">
              <DealsTextField
                id="deals-infants"
                label={dictionary.infantsLabel}
                type="number"
                min={0}
                inputMode="numeric"
                value={values.infants}
                onChange={(value) => updateValue("infants", value)}
              />
            </div>
            <div className="lg:col-span-3">
              <DealsSelectField
                id="deals-cabin"
                label={dictionary.cabinLabel}
                value={values.cabinClass}
                options={cabinClasses}
                onChange={(value) => updateValue("cabinClass", value)}
              />
            </div>
          </>
        ) : null}

        {includesHotel ? (
          <div className="lg:col-span-2">
            <DealsTextField
              id="deals-rooms"
              label={dictionary.roomsLabel}
              type="number"
              min={1}
              inputMode="numeric"
              value={values.rooms}
              onChange={(value) => updateValue("rooms", value)}
            />
          </div>
        ) : null}

        {includesCar ? (
          <div className="lg:col-span-2">
            <DealsSelectField
              id="deals-driver-age"
              label={dictionary.driverAgeLabel}
              value={values.driverAge}
              options={driverAgeOptions}
              onChange={(value) => updateValue("driverAge", value)}
            />
          </div>
        ) : null}

        <div className="flex flex-col justify-end lg:col-span-3">
          <button
            type="submit"
            className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-indigo-600 px-6 text-base font-black text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
          >
            {dictionary.submitLabel}
          </button>
        </div>
      </div>

      <p className={`${helpClass} mt-5 rounded-2xl bg-slate-50 px-4 py-3`}>
        {includesFlight ? dictionary.helperFlight : dictionary.helperHotel}
      </p>
    </form>
  );
}

export default function DealsPage() {
  const { locale } = useLocale();
  const lang = locale.startsWith("fr") ? "fr" : "en";
  const dictionary = copy[lang];

  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-gradient-to-b from-[#f5f3ff] via-white to-violet-50/50 pb-12">
        <section className="relative isolate overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(129,140,248,0.65),transparent_30%),radial-gradient(circle_at_76%_10%,rgba(45,212,191,0.42),transparent_25%),linear-gradient(120deg,#0f172a_0%,#312e81_50%,#7c3aed_100%)]" />
          <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(135deg,rgba(255,255,255,0.14)_0_1px,transparent_1px_16px)]" />
          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full border border-white/20 bg-white/10 blur-3xl" />
          <div className="absolute left-1/2 top-16 hidden h-48 w-[34rem] -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl lg:block" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f5f3ff] to-transparent" />

          <div className="page-shell relative py-10 sm:py-14 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(640px,1.35fr)] lg:items-center">
              <div className="max-w-2xl text-white">
                <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-100">
                  {dictionary.eyebrow}
                </p>
                <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  {dictionary.title}
                </h1>
                <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-indigo-50/90">
                  {dictionary.subtitle}
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:max-w-xl">
                  {["Flights", "Stays", "Cars"].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-sm backdrop-blur">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <DealsPackageSearchForm dictionary={dictionary} />
            </div>
          </div>
        </section>

        <section className="page-shell pt-10">
          <div className="grid gap-4 md:grid-cols-2">
            {dictionary.sections.map((section) => (
              <Card key={section.title} className="border-indigo-100 bg-white/90 p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700">
                  ✓
                </div>
                <h2 className="text-lg font-extrabold text-indigo-950">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{section.text}</p>
              </Card>
            ))}
          </div>

          <section className="mt-10 rounded-3xl border border-indigo-100 bg-white/90 p-5 shadow-[0_24px_70px_-45px_rgba(67,56,202,0.55)] sm:p-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-indigo-950">{dictionary.startersTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{dictionary.startersSubtitle}</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {searchStarters.map((starter) => (
                <Card key={starter.route} className="flex h-full flex-col border-indigo-100 p-5">
                  <p className="text-lg font-extrabold text-indigo-950">{starter.route}</p>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{starter.note}</p>

                  <LinkButton
                    href={starter.href}
                    variant="secondary"
                    className="mt-5 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    {dictionary.cta}
                  </LinkButton>
                </Card>
              ))}
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </>
  );
}
