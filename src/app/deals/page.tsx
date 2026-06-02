"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type DealTab = "flights" | "hotels" | "cars" | "packages";
type FlightTripType = "round-trip" | "one-way";

type FlightValues = {
  tripType: FlightTripType;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: string;
  children: string;
  infants: string;
  cabinClass: string;
  flexibleDates: boolean;
};

type HotelValues = {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  rooms: string;
};

type CarValues = {
  pickupLocation: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  driverAge: string;
  returnToDifferentLocation: boolean;
  dropoffLocation: string;
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

const dealTabs: Array<{ id: DealTab; label: string; description: string }> = [
  { id: "flights", label: "Flights", description: "Search flight routes" },
  { id: "hotels", label: "Hotels", description: "Search stays" },
  { id: "cars", label: "Cars", description: "Search rental cars" },
  { id: "packages", label: "Packages", description: "Plan trip parts" },
];

const cabinClasses = [
  { value: "economy", label: "Economy" },
  { value: "premium-economy", label: "Premium economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";

  return `${String(hour).padStart(2, "0")}:${minute}`;
});

const initialFlightValues: FlightValues = {
  tripType: "round-trip",
  origin: "",
  destination: "",
  departureDate: "",
  returnDate: "",
  adults: "1",
  children: "0",
  infants: "0",
  cabinClass: "economy",
  flexibleDates: false,
};

const initialHotelValues: HotelValues = {
  destination: "",
  checkIn: "",
  checkOut: "",
  guests: "1",
  rooms: "1",
};

const initialCarValues: CarValues = {
  pickupLocation: "",
  pickupDate: "",
  pickupTime: "10:00",
  dropoffDate: "",
  dropoffTime: "10:00",
  driverAge: "30",
  returnToDifferentLocation: false,
  dropoffLocation: "",
};

const copy = {
  en: {
    title: "Deals and route ideas",
    subtitle:
      "Use Kurioticket to start flexible searches and compare available provider results before booking. Prices and availability can change and are confirmed on the provider page.",
    verificationNote:
      "Live provider-backed deal feeds will appear only when those sources are connected, verified, and safe to present.",
    sections: [
      {
        title: "Start with flexible searches",
        text: "Use route ideas as a starting point, then adjust dates, travelers, and trip details on the results page.",
      },
      {
        title: "Compare before you book",
        text: "Review available provider results side by side so you can weigh route timing, stops, and booking terms clearly.",
      },
      {
        title: "Check final details with the provider",
        text: "Confirm the final fare, fees, availability, and policies on the provider page before completing your booking.",
      },
      {
        title: "Use saved routes and recent searches",
        text: "Keep useful searches close while you compare options over time and return to routes you want to revisit.",
      },
    ],
    startersTitle: "Try these search starters",
    startersSubtitle:
      "These are route ideas without displayed prices. Select one to begin a flight search and compare available provider results.",
    cta: "Search route",
  },

  fr: {
    title: "Offres et idées d’itinéraires",
    subtitle:
      "Utilisez Kurioticket pour lancer des recherches flexibles et comparer les résultats disponibles des fournisseurs avant de réserver. Les prix et disponibilités peuvent changer et sont confirmés sur la page du fournisseur.",
    verificationNote:
      "Les flux d’offres en direct soutenus par des fournisseurs n’apparaîtront que lorsque ces sources seront connectées, vérifiées et sûres à présenter.",
    sections: [
      {
        title: "Commencez par des recherches flexibles",
        text: "Utilisez les idées d’itinéraires comme point de départ, puis ajustez les dates, les voyageurs et les détails du voyage sur la page de résultats.",
      },
      {
        title: "Comparez avant de réserver",
        text: "Examinez les résultats disponibles des fournisseurs côte à côte afin d’évaluer clairement les horaires, les escales et les conditions de réservation.",
      },
      {
        title: "Vérifiez les détails finaux auprès du fournisseur",
        text: "Confirmez le tarif final, les frais, la disponibilité et les politiques sur la page du fournisseur avant de finaliser la réservation.",
      },
      {
        title: "Utilisez les itinéraires enregistrés et recherches récentes",
        text: "Gardez les recherches utiles à portée de main pendant que vous comparez les options et revenez aux itinéraires à revoir.",
      },
    ],
    startersTitle: "Essayez ces points de départ",
    startersSubtitle:
      "Ce sont des idées d’itinéraires sans prix affichés. Sélectionnez-en une pour lancer une recherche de vol et comparer les résultats disponibles des fournisseurs.",
    cta: "Rechercher l’itinéraire",
  },
};

const fieldClass =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15";
const labelClass = "text-sm font-bold text-slate-800";
const helpClass = "mt-1 text-xs font-medium text-slate-500";

const clampInteger = (value: string, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) return min;

  return Math.min(max, Math.max(min, parsed));
};

const isAfter = (endDate: string, endTime: string, startDate: string, startTime: string) =>
  new Date(`${endDate}T${endTime}`).getTime() > new Date(`${startDate}T${startTime}`).getTime();

function DealsTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  type = "text",
  min,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  type?: "text" | "date" | "number";
  min?: string | number;
  error?: string;
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
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClass}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-xs font-bold text-rose-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function DealsSelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className={labelClass}>{label}</span>
      <select
        id={id}
        name={id}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClass}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-xs font-bold text-rose-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function DealsSearchForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DealTab>("flights");
  const [flightValues, setFlightValues] = useState<FlightValues>(initialFlightValues);
  const [hotelValues, setHotelValues] = useState<HotelValues>(initialHotelValues);
  const [carValues, setCarValues] = useState<CarValues>(initialCarValues);
  const [error, setError] = useState("");

  const driverAgeOptions = useMemo(
    () =>
      Array.from({ length: 82 }, (_, index) => {
        const age = String(index + 18);

        return { value: age, label: age };
      }),
    [],
  );

  const updateFlightValue = <Key extends keyof FlightValues>(key: Key, value: FlightValues[Key]) => {
    setFlightValues((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const updateHotelValue = <Key extends keyof HotelValues>(key: Key, value: HotelValues[Key]) => {
    setHotelValues((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const updateCarValue = <Key extends keyof CarValues>(key: Key, value: CarValues[Key]) => {
    setCarValues((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const switchTab = (tab: DealTab) => {
    setActiveTab(tab);
    setError("");
  };

  const submitFlightSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const origin = flightValues.origin.trim();
    const destination = flightValues.destination.trim();
    const adults = clampInteger(flightValues.adults, 1, 9);
    const children = clampInteger(flightValues.children, 0, Math.max(0, 9 - adults));
    const infants = clampInteger(flightValues.infants, 0, Math.min(adults, Math.max(0, 9 - adults - children)));
    const travelers = adults + children + infants;

    setFlightValues((current) => ({
      ...current,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
    }));

    if (!origin) {
      setError("Enter where your flight starts.");
      return;
    }

    if (!destination) {
      setError("Enter where your flight is going.");
      return;
    }

    if (!flightValues.departureDate) {
      setError("Select a departure date.");
      return;
    }

    if (flightValues.tripType === "round-trip" && !flightValues.returnDate) {
      setError("Select a return date for a round trip.");
      return;
    }

    if (
      flightValues.tripType === "round-trip" &&
      flightValues.returnDate &&
      flightValues.returnDate < flightValues.departureDate
    ) {
      setError("Return date must be on or after the departure date.");
      return;
    }

    const params = new URLSearchParams({
      tripType: flightValues.tripType,
      origin,
      destination,
      departureDate: flightValues.departureDate,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      travelers: String(travelers),
      cabinClass: flightValues.cabinClass,
    });

    if (flightValues.tripType === "round-trip") {
      params.set("returnDate", flightValues.returnDate);
    }

    router.push(`/flights/results?${params.toString()}`);
  };

  const submitHotelSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const destination = hotelValues.destination.trim();
    const guests = clampInteger(hotelValues.guests, 1, 12);
    const rooms = clampInteger(hotelValues.rooms, 1, 6);

    setHotelValues((current) => ({ ...current, guests: String(guests), rooms: String(rooms) }));

    if (!destination) {
      setError("Enter a hotel destination.");
      return;
    }

    if (!hotelValues.checkIn) {
      setError("Select a check-in date.");
      return;
    }

    if (!hotelValues.checkOut) {
      setError("Select a check-out date.");
      return;
    }

    if (hotelValues.checkOut <= hotelValues.checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }

    const params = new URLSearchParams({
      destination,
      checkIn: hotelValues.checkIn,
      checkOut: hotelValues.checkOut,
      guests: String(guests),
      rooms: String(rooms),
    });

    router.push(`/hotels/results?${params.toString()}`);
  };

  const submitCarSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const pickupLocation = carValues.pickupLocation.trim();
    const dropoffLocation = carValues.returnToDifferentLocation ? carValues.dropoffLocation.trim() : pickupLocation;
    const driverAge = clampInteger(carValues.driverAge, 18, 99);

    setCarValues((current) => ({ ...current, driverAge: String(driverAge) }));

    if (!pickupLocation) {
      setError("Enter a pickup location.");
      return;
    }

    if (!carValues.pickupDate || !carValues.pickupTime) {
      setError("Select a pickup date and time.");
      return;
    }

    if (!carValues.dropoffDate || !carValues.dropoffTime) {
      setError("Select a drop-off date and time.");
      return;
    }

    if (!isAfter(carValues.dropoffDate, carValues.dropoffTime, carValues.pickupDate, carValues.pickupTime)) {
      setError("Drop-off must be after pickup.");
      return;
    }

    if (!carValues.driverAge) {
      setError("Select a driver age.");
      return;
    }

    if (carValues.returnToDifferentLocation && !dropoffLocation) {
      setError("Enter a drop-off location.");
      return;
    }

    const params = new URLSearchParams({
      pickupLocation,
      pickupDate: carValues.pickupDate,
      pickupTime: carValues.pickupTime,
      dropoffDate: carValues.dropoffDate,
      dropoffTime: carValues.dropoffTime,
      driverAge: String(driverAge),
      dropoffLocation,
    });

    router.push(`/cars/results?${params.toString()}`);
  };

  return (
    <section className="mt-10" aria-labelledby="deals-search-heading">
      <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-[0_30px_90px_-48px_rgba(79,70,229,0.72)]">
        <div className="grid lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="border-b border-slate-100 bg-slate-50/80 p-3 lg:border-b-0 lg:border-r" aria-label="Travel category">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {dealTabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={isActive}
                    className={`rounded-2xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                        : "bg-white text-slate-700 shadow-sm hover:bg-indigo-50"
                    }`}
                    onClick={() => switchTab(tab.id)}
                  >
                    <span className="block text-sm font-black">{tab.label}</span>
                    <span className={`mt-1 block text-xs font-semibold ${isActive ? "text-indigo-100" : "text-slate-500"}`}>
                      {tab.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Provider-neutral search</p>
                <h2 id="deals-search-heading" className="mt-2 text-2xl font-extrabold tracking-tight text-indigo-950 sm:text-3xl">
                  Search travel deals
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Start with your trip details. Kurioticket will open provider-backed search results when available.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs font-bold leading-5 text-indigo-900">
                No provider data is fetched on this page.
              </div>
            </div>

            <div aria-live="polite" className="mt-4 min-h-6">
              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</p>
              ) : null}
            </div>

            {activeTab === "flights" ? (
              <form className="mt-3 space-y-5" noValidate onSubmit={submitFlightSearch}>
                <fieldset>
                  <legend className={labelClass}>Trip type</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["round-trip", "one-way"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={flightValues.tripType === type}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 ${
                          flightValues.tripType === type
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                        }`}
                        onClick={() => updateFlightValue("tripType", type)}
                      >
                        {type === "round-trip" ? "Round-trip" : "One-way"}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <DealsTextField
                    id="flight-origin"
                    label="From"
                    value={flightValues.origin}
                    placeholder="City or airport"
                    autoComplete="off"
                    onChange={(value) => updateFlightValue("origin", value)}
                  />
                  <DealsTextField
                    id="flight-destination"
                    label="To"
                    value={flightValues.destination}
                    placeholder="City or airport"
                    autoComplete="off"
                    onChange={(value) => updateFlightValue("destination", value)}
                  />
                  <DealsTextField
                    id="flight-departure"
                    label="Departure"
                    type="date"
                    value={flightValues.departureDate}
                    onChange={(value) => updateFlightValue("departureDate", value)}
                  />
                  <DealsTextField
                    id="flight-return"
                    label="Return"
                    type="date"
                    value={flightValues.returnDate}
                    onChange={(value) => updateFlightValue("returnDate", value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
                  <DealsTextField
                    id="flight-adults"
                    label="Adults"
                    type="number"
                    min={1}
                    value={flightValues.adults}
                    onChange={(value) => updateFlightValue("adults", value)}
                  />
                  <DealsTextField
                    id="flight-children"
                    label="Children"
                    type="number"
                    min={0}
                    value={flightValues.children}
                    onChange={(value) => updateFlightValue("children", value)}
                  />
                  <DealsTextField
                    id="flight-infants"
                    label="Infants"
                    type="number"
                    min={0}
                    value={flightValues.infants}
                    onChange={(value) => updateFlightValue("infants", value)}
                  />
                  <DealsSelectField
                    id="flight-cabin"
                    label="Cabin class"
                    value={flightValues.cabinClass}
                    options={cabinClasses}
                    onChange={(value) => updateFlightValue("cabinClass", value)}
                  />
                  <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800 shadow-sm xl:mt-7">
                    <input
                      type="checkbox"
                      checked={flightValues.flexibleDates}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={(event) => updateFlightValue("flexibleDates", event.target.checked)}
                    />
                    Flexible dates
                  </label>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className={helpClass}>Kurioticket sends your search to the flight results flow without displaying unverified inventory here.</p>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                  >
                    Search flights
                  </button>
                </div>
              </form>
            ) : null}

            {activeTab === "hotels" ? (
              <form className="mt-3 space-y-5" noValidate onSubmit={submitHotelSearch}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="xl:col-span-2">
                    <DealsTextField
                      id="hotel-destination"
                      label="Destination"
                      value={hotelValues.destination}
                      placeholder="City, area, or hotel name"
                      autoComplete="off"
                      onChange={(value) => updateHotelValue("destination", value)}
                    />
                  </div>
                  <DealsTextField
                    id="hotel-check-in"
                    label="Check-in"
                    type="date"
                    value={hotelValues.checkIn}
                    onChange={(value) => updateHotelValue("checkIn", value)}
                  />
                  <DealsTextField
                    id="hotel-check-out"
                    label="Check-out"
                    type="date"
                    value={hotelValues.checkOut}
                    onChange={(value) => updateHotelValue("checkOut", value)}
                  />
                  <DealsTextField
                    id="hotel-guests"
                    label="Guests"
                    type="number"
                    min={1}
                    value={hotelValues.guests}
                    onChange={(value) => updateHotelValue("guests", value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
                  <DealsTextField
                    id="hotel-rooms"
                    label="Rooms"
                    type="number"
                    min={1}
                    value={hotelValues.rooms}
                    onChange={(value) => updateHotelValue("rooms", value)}
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <p className={helpClass}>Hotel pricing and room details are confirmed only in connected provider-backed result flows.</p>
                    <button
                      type="submit"
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                    >
                      Search hotels
                    </button>
                  </div>
                </div>
              </form>
            ) : null}

            {activeTab === "cars" ? (
              <form className="mt-3 space-y-5" noValidate onSubmit={submitCarSearch}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <DealsTextField
                    id="car-pickup-location"
                    label="Pickup location"
                    value={carValues.pickupLocation}
                    placeholder="City, airport, or station"
                    autoComplete="off"
                    onChange={(value) => updateCarValue("pickupLocation", value)}
                  />
                  <DealsTextField
                    id="car-pickup-date"
                    label="Pickup date"
                    type="date"
                    value={carValues.pickupDate}
                    onChange={(value) => updateCarValue("pickupDate", value)}
                  />
                  <DealsSelectField
                    id="car-pickup-time"
                    label="Pickup time"
                    value={carValues.pickupTime}
                    options={timeOptions.map((time) => ({ value: time, label: time }))}
                    onChange={(value) => updateCarValue("pickupTime", value)}
                  />
                  <DealsSelectField
                    id="car-driver-age"
                    label="Driver age"
                    value={carValues.driverAge}
                    options={driverAgeOptions}
                    onChange={(value) => updateCarValue("driverAge", value)}
                  />
                  <DealsTextField
                    id="car-dropoff-date"
                    label="Drop-off date"
                    type="date"
                    value={carValues.dropoffDate}
                    onChange={(value) => updateCarValue("dropoffDate", value)}
                  />
                  <DealsSelectField
                    id="car-dropoff-time"
                    label="Drop-off time"
                    value={carValues.dropoffTime}
                    options={timeOptions.map((time) => ({ value: time, label: time }))}
                    onChange={(value) => updateCarValue("dropoffTime", value)}
                  />
                  <div className="md:col-span-2">
                    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800 shadow-sm xl:mt-7">
                      <input
                        type="checkbox"
                        checked={carValues.returnToDifferentLocation}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        onChange={(event) => updateCarValue("returnToDifferentLocation", event.target.checked)}
                      />
                      Return to a different location
                    </label>
                  </div>
                </div>

                {carValues.returnToDifferentLocation ? (
                  <div className="max-w-md">
                    <DealsTextField
                      id="car-dropoff-location"
                      label="Drop-off location"
                      value={carValues.dropoffLocation}
                      placeholder="City, airport, or station"
                      autoComplete="off"
                      onChange={(value) => updateCarValue("dropoffLocation", value)}
                    />
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className={helpClass}>Car inventory and rental terms are shown only after a provider-backed search flow can confirm them.</p>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                  >
                    Search cars
                  </button>
                </div>
              </form>
            ) : null}

            {activeTab === "packages" ? (
              <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
                <h3 className="text-xl font-extrabold text-indigo-950">Plan trip parts separately for now</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                  Package-style planning is being kept provider-neutral while Kurioticket connects verified search flows. Start with flights or hotels, then add cars when your trip details are ready.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
                    onClick={() => switchTab("flights")}
                  >
                    Search flights
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-indigo-200 bg-white px-5 text-sm font-black text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
                    onClick={() => switchTab("hotels")}
                  >
                    Search hotels
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DealsPage() {
  const { locale } = useLocale();

  const lang = locale.startsWith("fr") ? "fr" : "en";

  const c = copy[lang];

  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-gradient-to-b from-indigo-50 via-white to-violet-50/40 pt-8 pb-12 sm:pt-10 lg:pt-12">
        <section className="page-shell">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-indigo-600">
              Kurioticket planning
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-indigo-950 sm:text-5xl">
              {c.title}
            </h1>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              {c.subtitle}
            </p>
            <p className="mt-3 rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 text-sm font-medium leading-6 text-slate-600 shadow-sm">
              {c.verificationNote}
            </p>
          </div>

          <DealsSearchForm />

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {c.sections.map((section) => (
              <Card
                key={section.title}
                className="border-indigo-100 p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700">
                  ✓
                </div>
                <h2 className="text-lg font-extrabold text-indigo-950">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {section.text}
                </p>
              </Card>
            ))}
          </div>

          <section className="mt-10 rounded-3xl border border-indigo-100 bg-white/85 p-5 shadow-[0_24px_70px_-45px_rgba(67,56,202,0.55)] sm:p-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-indigo-950">
                {c.startersTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {c.startersSubtitle}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {searchStarters.map((starter) => (
                <Card
                  key={starter.route}
                  className="flex h-full flex-col border-indigo-100 p-5"
                >
                  <p className="text-lg font-extrabold text-indigo-950">
                    {starter.route}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                    {starter.note}
                  </p>

                  <LinkButton
                    href={starter.href}
                    variant="secondary"
                    className="mt-5 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    {c.cta}
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
