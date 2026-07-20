"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { FlightCard } from "@/components/results/FlightCard";
import { translations as en } from "@/lib/i18n/en";
import type { PublicFlightResult } from "@/lib/types";
import {
  buildFlightApiRequest,
  buildModifyDealsUrl,
  buildStandaloneFlightUrl,
  getCarSearchSummary,
  getDealsProducts,
  getHotelSearchSummary,
  type DealsSearch,
} from "@/lib/deals/dealsSearchParams";

export function DealsResultsClient({ search }: { search: DealsSearch }) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? en[key] ?? key;
  const products = getDealsProducts(search.mode);
  const modeKey = `deals.package.${search.mode === "hotel-flight" ? "hotelFlight" : search.mode === "hotel-flight-car" ? "hotelFlightCar" : search.mode === "flight-car" ? "flightCar" : "hotelCar"}`;
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-bold uppercase tracking-wider text-[#004BB8]">
              {t("deals")}
            </p>
            <h1 className="text-3xl font-bold text-slate-950">
              {t("deals.results.heading")}
            </h1>
            <p className="mt-1 text-slate-600">{t(modeKey)}</p>
          </div>
          <Link
            className="min-h-11 rounded-lg border border-[#004BB8] px-5 py-2.5 font-bold text-[#004BB8]"
            href={buildModifyDealsUrl(search)}
          >
            {t("deals.results.modify")}
          </Link>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <aside className="order-first rounded-2xl border border-slate-200 bg-white p-5 lg:order-last lg:sticky lg:top-24">
            <h2 className="font-bold text-slate-950">
              {t("deals.results.tripSummary")}
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Item
                label={t("deals.destinationLabel")}
                value={search.destination}
              />
              {products.flight && (
                <Item
                  label={t("deals.results.route")}
                  value={`${search.origin} → ${search.destination}`}
                />
              )}
              <Item
                label={t("deals.datesLabel")}
                value={`${search.startDate} — ${search.endDate}`}
              />
              <Item
                label={t("deals.results.travelers")}
                value={String(search.adults + search.children)}
              />
            </dl>
            <h3 className="mt-5 text-sm font-bold text-slate-900">
              {t("deals.results.included")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {products.flight && <Pill text={t("flights")} />}{" "}
              {products.hotel && <Pill text={t("hotels")} />}{" "}
              {products.car && <Pill text={t("cars")} />}
            </div>
          </aside>
          <div className="min-w-0 space-y-6">
            {products.flight && <FlightSection search={search} />}{" "}
            {products.hotel && (
              <UnavailableSection kind="hotel" search={search} />
            )}{" "}
            {products.car && <UnavailableSection kind="car" search={search} />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words font-semibold text-slate-900" dir="auto">
        {value}
      </dd>
    </div>
  );
}
function Pill({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-[#004BB8]">
      {text}
    </span>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FlightSection({ search }: { search: DealsSearch }) {
  const { t: dictionary } = useLocale();
  const t = (k: string) => dictionary[k] ?? en[k] ?? k;
  const { selectedOption } = useRegion();
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">(
    "loading",
  );
  const [results, setResults] = useState<PublicFlightResult[]>([]);
  const body = useMemo(
    () => buildFlightApiRequest(search, selectedOption.currency),
    [search, selectedOption.currency],
  );
  useEffect(() => {
    if (!body) return;
    const controller = new AbortController();
    let current = true;
    fetch("/api/flights/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (
          !response.ok ||
          !payload ||
          typeof payload !== "object" ||
          !Array.isArray((payload as { results?: unknown }).results)
        )
          throw new Error();
        return (payload as { results: PublicFlightResult[] }).results;
      })
      .then((data) => {
        if (current) {
          setResults(data.slice(0, 5));
          setState(data.length ? "ready" : "empty");
        }
      })
      .catch((error) => {
        if (current && error instanceof Error && error.name !== "AbortError")
          setState("error");
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [body]);
  return (
    <Section title={t("deals.results.flightTitle")}>
      <div aria-busy={state === "loading"}>
        {state === "loading" && (
          <p role="status">{t("deals.results.flightLoading")}</p>
        )}
        {state === "empty" && (
          <p role="status">{t("deals.results.flightEmpty")}</p>
        )}
        {state === "error" && (
          <p role="status">{t("deals.results.flightError")}</p>
        )}
        {state === "ready" && (
          <div className="space-y-4">
            {results.map((f) => (
              <FlightCard key={f.id} flight={f} />
            ))}
          </div>
        )}
      </div>
      <Link
        href={buildStandaloneFlightUrl(search)}
        className="mt-5 inline-flex min-h-11 items-center font-bold text-[#004BB8]"
      >
        {t("deals.results.viewAllFlights")}
      </Link>
      <p className="text-xs text-slate-500">
        {t("deals.results.flightPriceNotice")}
      </p>
    </Section>
  );
}
function UnavailableSection({
  kind,
  search,
}: {
  kind: "hotel" | "car";
  search: DealsSearch;
}) {
  const { t: d } = useLocale();
  const t = (k: string) => d[k] ?? en[k] ?? k;
  const summary =
    kind === "hotel"
      ? getHotelSearchSummary(search)
      : getCarSearchSummary(search);
  return (
    <Section
      title={t(
        kind === "hotel"
          ? "deals.results.hotelTitle"
          : "deals.results.carTitle",
      )}
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {Object.entries(summary).map(([key, value]) => (
          <Item
            key={key}
            label={t(`deals.results.summary.${key}`)}
            value={String(value)}
          />
        ))}
      </dl>
      <div
        role="status"
        className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950"
      >
        {t(
          kind === "hotel"
            ? "deals.results.hotelUnavailable"
            : "deals.results.carUnavailable",
        )}
      </div>
    </Section>
  );
}
