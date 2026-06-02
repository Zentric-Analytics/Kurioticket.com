"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type PackageMode = "hotel-flight" | "hotel-flight-car" | "flight-car" | "hotel-car";

const packageModes: Array<{
  value: PackageMode;
  label: string;
  includesFlight: boolean;
  includesHotel: boolean;
  includesCar: boolean;
}> = [
  { value: "hotel-flight", label: "Hotel + Flight", includesFlight: true, includesHotel: true, includesCar: false },
  {
    value: "hotel-flight-car",
    label: "Hotel + Flight + Car",
    includesFlight: true,
    includesHotel: true,
    includesCar: true,
  },
  { value: "flight-car", label: "Flight + Car", includesFlight: true, includesHotel: false, includesCar: true },
  { value: "hotel-car", label: "Hotel + Car", includesFlight: false, includesHotel: true, includesCar: true },
];

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
    title: "Start a travel search",
    subtitle: "Use simple route starters to begin comparing provider results.",
    formTitle: "Search travel packages",
    formSubtitle: "Build a search around flights, stays, and cars.",
    modeLegend: "Choose package type",
    origin: "Where from?",
    destination: "Where to?",
    dates: "Dates",
    departDate: "Start date",
    returnDate: "End date",
    travelersRooms: "Travelers / rooms",
    adults: "Adults",
    children: "Children",
    rooms: "Rooms",
    driverAge: "Driver age",
    search: "Search",
    errors: {
      origin: "Enter a departure city or airport.",
      destination: "Enter a destination.",
      startDate: "Choose a start date.",
      endDate: "Choose an end date.",
      dateOrder: "End date must be after start date.",
      adults: "At least one adult is required.",
      children: "Children cannot be below zero.",
      rooms: "At least one room is required.",
      guests: "At least one guest is required.",
    },
    startersTitle: "Search starters",
    startersSubtitle: "Route ideas without displayed fares. Select one to begin a flight search.",
    cta: "Search route",
  },
  fr: {
    title: "Lancez une recherche voyage",
    subtitle: "Utilisez des itinéraires simples pour commencer à comparer les résultats des fournisseurs.",
    formTitle: "Rechercher des forfaits voyage",
    formSubtitle: "Créez une recherche autour des vols, séjours et voitures.",
    modeLegend: "Choisir le type de forfait",
    origin: "D’où partez-vous?",
    destination: "Où allez-vous?",
    dates: "Dates",
    departDate: "Date de début",
    returnDate: "Date de fin",
    travelersRooms: "Voyageurs / chambres",
    adults: "Adultes",
    children: "Enfants",
    rooms: "Chambres",
    driverAge: "Âge du conducteur",
    search: "Rechercher",
    errors: {
      origin: "Entrez une ville ou un aéroport de départ.",
      destination: "Entrez une destination.",
      startDate: "Choisissez une date de début.",
      endDate: "Choisissez une date de fin.",
      dateOrder: "La date de fin doit suivre la date de début.",
      adults: "Au moins un adulte est requis.",
      children: "Le nombre d’enfants ne peut pas être négatif.",
      rooms: "Au moins une chambre est requise.",
      guests: "Au moins un voyageur est requis.",
    },
    startersTitle: "Points de départ",
    startersSubtitle: "Des idées d’itinéraires sans tarifs affichés. Sélectionnez-en une pour lancer une recherche de vol.",
    cta: "Rechercher l’itinéraire",
  },
};

export default function DealsPage() {
  const { locale } = useLocale();
  const router = useRouter();
  const lang = locale.startsWith("fr") ? "fr" : "en";
  const dictionary = copy[lang];
  const [packageMode, setPackageMode] = useState<PackageMode>("hotel-flight");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [driverAge, setDriverAge] = useState(30);
  const [error, setError] = useState("");

  const selectedMode = packageModes.find((mode) => mode.value === packageMode) ?? packageModes[0];
  const includesFlight = selectedMode.includesFlight;
  const includesHotel = selectedMode.includesHotel;
  const includesCar = selectedMode.includesCar;

  const normalizeMinimum = (value: number, minimum: number) => (Number.isFinite(value) ? Math.max(minimum, value) : minimum);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();
    const normalizedAdults = normalizeMinimum(adults, 1);
    const normalizedChildren = normalizeMinimum(children, 0);
    const normalizedRooms = normalizeMinimum(rooms, 1);
    const normalizedDriverAge = normalizeMinimum(driverAge, 18);

    setAdults(normalizedAdults);
    setChildren(normalizedChildren);
    setRooms(normalizedRooms);
    setDriverAge(normalizedDriverAge);

    if (includesFlight && !trimmedOrigin) {
      setError(dictionary.errors.origin);
      return;
    }

    if (!trimmedDestination) {
      setError(dictionary.errors.destination);
      return;
    }

    if (!startDate) {
      setError(dictionary.errors.startDate);
      return;
    }

    if (!endDate) {
      setError(dictionary.errors.endDate);
      return;
    }

    if (endDate <= startDate) {
      setError(dictionary.errors.dateOrder);
      return;
    }

    if (normalizedAdults < 1) {
      setError(dictionary.errors.adults);
      return;
    }

    if (normalizedChildren < 0) {
      setError(dictionary.errors.children);
      return;
    }

    if (!includesFlight && normalizedAdults + normalizedChildren < 1) {
      setError(dictionary.errors.guests);
      return;
    }

    if (includesHotel && normalizedRooms < 1) {
      setError(dictionary.errors.rooms);
      return;
    }

    setError("");

    if (includesFlight) {
      const travelers = normalizedAdults + normalizedChildren;
      const params = new URLSearchParams({
        tripType: "round-trip",
        origin: trimmedOrigin,
        destination: trimmedDestination,
        departureDate: startDate,
        returnDate: endDate,
        adults: String(normalizedAdults),
        children: String(normalizedChildren),
        infants: "0",
        travelers: String(travelers),
        cabinClass: "economy",
      });

      router.push(`/flights/results?${params.toString()}`);
      return;
    }

    const guests = normalizedAdults + normalizedChildren;
    const params = new URLSearchParams({
      destination: trimmedDestination,
      checkIn: startDate,
      checkOut: endDate,
      guests: String(guests),
      rooms: String(normalizedRooms),
    });

    router.push(`/hotels/results?${params.toString()}`);
  };

  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-slate-50 pb-12">
        <section className="border-b border-slate-200 bg-white">
          <div className="page-shell py-10 sm:py-14">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{dictionary.title}</h1>
              <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-600">{dictionary.subtitle}</p>
            </div>
          </div>
        </section>

        <section className="page-shell pt-8 sm:pt-10">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-indigo-200 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:p-6"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">{dictionary.formTitle}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{dictionary.formSubtitle}</p>
              </div>

              <fieldset className="min-w-0" aria-label={dictionary.modeLegend}>
                <legend className="sr-only">{dictionary.modeLegend}</legend>
                <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                  {packageModes.map((mode) => (
                    <label
                      key={mode.value}
                      className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-extrabold transition focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 ${
                        packageMode === mode.value
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="packageMode"
                        value={mode.value}
                        checked={packageMode === mode.value}
                        onChange={() => {
                          setPackageMode(mode.value);
                          setError("");
                        }}
                      />
                      {mode.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border-2 border-indigo-500 bg-white shadow-inner">
              <div className="grid divide-y divide-slate-200 lg:grid-cols-[1fr_1fr_1.5fr_1.7fr_auto] lg:divide-x lg:divide-y-0">
                {includesFlight ? (
                  <label className="flex min-h-24 flex-col justify-center px-4 py-3">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{dictionary.origin}</span>
                    <input
                      value={origin}
                      onChange={(event) => setOrigin(event.target.value)}
                      placeholder="City or airport"
                      className="mt-2 w-full bg-transparent text-base font-extrabold text-slate-950 outline-none placeholder:text-slate-400"
                      autoComplete="address-level2"
                      required={includesFlight}
                    />
                  </label>
                ) : (
                  <div className="hidden lg:block" aria-hidden="true" />
                )}

                <label className="flex min-h-24 flex-col justify-center px-4 py-3">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{dictionary.destination}</span>
                  <input
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder="City, airport, or area"
                    className="mt-2 w-full bg-transparent text-base font-extrabold text-slate-950 outline-none placeholder:text-slate-400"
                    autoComplete="address-level2"
                    required
                  />
                </label>

                <fieldset className="min-h-24 px-4 py-3">
                  <legend className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{dictionary.dates}</legend>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <label className="min-w-0">
                      <span className="sr-only">{dictionary.departDate}</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="w-full bg-transparent text-sm font-extrabold text-slate-950 outline-none"
                        required
                      />
                    </label>
                    <label className="min-w-0">
                      <span className="sr-only">{dictionary.returnDate}</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="w-full bg-transparent text-sm font-extrabold text-slate-950 outline-none"
                        required
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="min-h-24 px-4 py-3">
                  <legend className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    {dictionary.travelersRooms}
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    <label className="min-w-0">
                      <span className="text-[0.68rem] font-bold text-slate-500">{dictionary.adults}</span>
                      <input
                        type="number"
                        min={1}
                        value={adults}
                        onChange={(event) => setAdults(Number(event.target.value))}
                        className="mt-1 w-full bg-transparent text-sm font-extrabold text-slate-950 outline-none"
                      />
                    </label>
                    <label className="min-w-0">
                      <span className="text-[0.68rem] font-bold text-slate-500">{dictionary.children}</span>
                      <input
                        type="number"
                        min={0}
                        value={children}
                        onChange={(event) => setChildren(Number(event.target.value))}
                        className="mt-1 w-full bg-transparent text-sm font-extrabold text-slate-950 outline-none"
                      />
                    </label>
                    {includesHotel ? (
                      <label className="min-w-0">
                        <span className="text-[0.68rem] font-bold text-slate-500">{dictionary.rooms}</span>
                        <input
                          type="number"
                          min={1}
                          value={rooms}
                          onChange={(event) => setRooms(Number(event.target.value))}
                          className="mt-1 w-full bg-transparent text-sm font-extrabold text-slate-950 outline-none"
                        />
                      </label>
                    ) : null}
                    {includesCar ? (
                      <label className="min-w-0">
                        <span className="text-[0.68rem] font-bold text-slate-500">{dictionary.driverAge}</span>
                        <input
                          type="number"
                          min={18}
                          value={driverAge}
                          onChange={(event) => setDriverAge(Number(event.target.value))}
                          className="mt-1 w-full bg-transparent text-sm font-extrabold text-slate-950 outline-none"
                        />
                      </label>
                    ) : null}
                  </div>
                </fieldset>

                <div className="flex items-stretch p-3 lg:min-h-24 lg:items-center">
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-base font-black text-white shadow-lg shadow-indigo-900/20 transition hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 lg:w-auto"
                  >
                    {dictionary.search}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 min-h-6" aria-live="polite">
              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </form>
        </section>

        <section className="page-shell pt-8 sm:pt-10">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">{dictionary.startersTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{dictionary.startersSubtitle}</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {searchStarters.map((starter) => (
                <Card key={starter.route} className="flex h-full flex-col border-slate-200 p-5">
                  <p className="text-lg font-extrabold text-slate-950">{starter.route}</p>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{starter.note}</p>

                  <LinkButton href={starter.href} variant="secondary" className="mt-5">
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
