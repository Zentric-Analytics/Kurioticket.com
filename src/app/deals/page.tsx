"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";
import {
  buildDealsResultsUrl,
  dealsModes,
  getDealsProducts,
  parseDealsSearchParams,
  validateDealsSearch,
  type DealsPackageMode,
  type DealsSearch,
} from "@/lib/deals/dealsSearchParams";

const modeKeys: Record<DealsPackageMode, string> = {
  "hotel-flight": "deals.package.hotelFlight",
  "hotel-flight-car": "deals.package.hotelFlightCar",
  "flight-car": "deals.package.flightCar",
  "hotel-car": "deals.package.hotelCar",
};
const fieldClass =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950 focus:border-[#004BB8] focus:outline-none focus:ring-2 focus:ring-[#004BB8]/20";
const labelClass = "grid gap-1 text-sm font-semibold text-slate-700";

export default function DealsPage() {
  const query = useSearchParams();
  const router = useRouter();
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? en[key] ?? key;
  const [search, setSearch] = useState<DealsSearch>(() =>
    parseDealsSearchParams(query),
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof DealsSearch, string>>
  >({});
  const [carOpen, setCarOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => setSearch(parseDealsSearchParams(query)), [query]);
  const products = getDealsProducts(search.mode);
  const set = <K extends keyof DealsSearch>(key: K, value: DealsSearch[K]) =>
    setSearch((previous) => {
      const next = { ...previous, [key]: value };
      if (key === "destination") {
        if (
          !previous.carPickupLocation ||
          previous.carPickupLocation === previous.destination
        )
          next.carPickupLocation = String(value);
        if (
          !previous.carDropoffLocation ||
          previous.carDropoffLocation === previous.destination
        )
          next.carDropoffLocation = String(value);
      }
      if (key === "startDate") {
        if (previous.hotelStayMode === "match-trip")
          next.hotelCheckIn = String(value);
        if (
          !previous.carPickupDate ||
          previous.carPickupDate === previous.startDate
        )
          next.carPickupDate = String(value);
      }
      if (key === "endDate") {
        if (previous.hotelStayMode === "match-trip")
          next.hotelCheckOut = String(value);
        if (
          !previous.carDropoffDate ||
          previous.carDropoffDate === previous.endDate
        )
          next.carDropoffDate = String(value);
      }
      return next;
    });
  const changeMode = (mode: DealsPackageMode) => {
    setSearch((previous) => ({ ...previous, mode }));
    setErrors({});
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateDealsSearch(search);
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    router.push(buildDealsResultsUrl(search));
  };
  const input = (name: keyof DealsSearch, label: string, type = "text") => (
    <label className={labelClass}>
      {label}
      <input
        className={fieldClass}
        name={name}
        type={type}
        value={String(search[name])}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        onChange={(e) =>
          set(
            name,
            (typeof search[name] === "number"
              ? Number(e.target.value)
              : e.target.value) as never,
          )
        }
      />
      {errors[name] && (
        <span
          id={`${name}-error`}
          role="alert"
          className="text-xs text-red-700"
        >
          {t(errors[name]!)}
        </span>
      )}
    </label>
  );
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main>
        <section className="bg-[#021C2B] px-4 py-12 text-white">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-bold uppercase tracking-widest text-sky-300">
              {t("deals")}
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-5xl">
              {t("deals.heroTitle")}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-200">
              {t("deals.heroSubtitle")}
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-8">
          <form
            ref={formRef}
            onSubmit={submit}
            noValidate
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6"
          >
            <fieldset>
              <legend className="mb-3 font-bold text-slate-900">
                {t("deals.packageLegend")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {dealsModes.map((mode) => (
                  <label
                    key={mode}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold ${search.mode === mode ? "border-[#004BB8] bg-blue-50 text-[#004BB8]" : "border-slate-300 text-slate-700"}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="mode"
                      checked={search.mode === mode}
                      onChange={() => changeMode(mode)}
                    />
                    {t(modeKeys[mode])}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-6">
              <legend className="sr-only">
                {t("deals.results.tripSummary")}
              </legend>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {products.flight && input("origin", t("deals.originLabel"))}
                {input("destination", t("deals.destinationLabel"))}
                {input(
                  "startDate",
                  products.flight
                    ? t("deals.departDate")
                    : t("deals.results.hotelCheckIn"),
                  "date",
                )}
                {input(
                  "endDate",
                  products.flight
                    ? t("deals.returnDate")
                    : t("deals.results.hotelCheckOut"),
                  "date",
                )}
                {input("adults", t("deals.results.adults"), "number")}
                {input("children", t("deals.results.children"), "number")}
                {products.hotel && input("rooms", t("rooms"), "number")}
                {products.flight && (
                  <label className={labelClass}>
                    {t("deals.cabinClass")}
                    <select
                      name="cabinClass"
                      className={fieldClass}
                      value={search.cabinClass}
                      onChange={(e) =>
                        set(
                          "cabinClass",
                          e.target.value as DealsSearch["cabinClass"],
                        )
                      }
                    >
                      <option value="economy">
                        {t("deals.cabin.economy")}
                      </option>
                      <option value="business">
                        {t("deals.cabin.business")}
                      </option>
                      <option value="first">{t("deals.cabin.first")}</option>
                    </select>
                  </label>
                )}
              </div>
            </fieldset>
            {products.hotel && products.flight && (
              <fieldset className="mt-5">
                <legend className="sr-only">
                  {t("deals.results.hotelDates")}
                </legend>
                <label className="flex min-h-11 items-center gap-3 font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={search.hotelStayMode === "custom"}
                    onChange={(e) => {
                      set(
                        "hotelStayMode",
                        e.target.checked ? "custom" : "match-trip",
                      );
                      if (!e.target.checked)
                        setSearch((p) => ({
                          ...p,
                          hotelStayMode: "match-trip",
                          hotelCheckIn: p.startDate,
                          hotelCheckOut: p.endDate,
                        }));
                    }}
                  />
                  {t("deals.results.customHotelDates")}
                </label>
                {search.hotelStayMode === "custom" && (
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {input(
                      "hotelCheckIn",
                      t("deals.results.hotelCheckIn"),
                      "date",
                    )}
                    {input(
                      "hotelCheckOut",
                      t("deals.results.hotelCheckOut"),
                      "date",
                    )}
                  </div>
                )}
              </fieldset>
            )}
            {products.car && (
              <fieldset className="mt-5 rounded-xl bg-slate-50 p-4">
                <legend className="font-bold text-slate-900">
                  {t("deals.results.carDetails")}
                </legend>
                <p className="mt-1 text-sm text-slate-600">
                  {search.carPickupLocation || search.destination} ·{" "}
                  {search.carPickupDate || search.startDate}{" "}
                  {search.carPickupTime}
                </p>
                <button
                  type="button"
                  aria-expanded={carOpen}
                  onClick={() => setCarOpen((v) => !v)}
                  className="mt-2 min-h-11 font-bold text-[#004BB8]"
                >
                  {t("deals.results.customizeCar")}
                </button>
                {carOpen && (
                  <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {input("carPickupLocation", t("deals.results.carPickup"))}
                    {input("carDropoffLocation", t("deals.results.carDropoff"))}
                    {input(
                      "carPickupDate",
                      t("deals.results.pickupDate"),
                      "date",
                    )}
                    {input(
                      "carDropoffDate",
                      t("deals.results.dropoffDate"),
                      "date",
                    )}
                    {input(
                      "carPickupTime",
                      t("deals.results.pickupTime"),
                      "time",
                    )}
                    {input(
                      "carDropoffTime",
                      t("deals.results.dropoffTime"),
                      "time",
                    )}
                    {input("driverAge", t("deals.driverAge"))}
                  </div>
                )}
              </fieldset>
            )}
            <div className="mt-6 flex justify-end">
              <button className="min-h-12 rounded-xl bg-[#004BB8] px-8 font-bold text-white hover:bg-[#003b91]">
                {t("deals.searchButton")}
              </button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
