import Image from "next/image";
import Link from "next/link";
import type { PublicFlightResult } from "@/lib/types";
import { useRegion } from "@/components/region/RegionProvider";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { normalizeFlightLegs, safeDateTime } from "@/lib/deals/dealsResultsPresentation";

export function DealsFlightPreviewCard({ flight, href, locale, t }: { flight: PublicFlightResult; href: string; locale: string; t: (key: string) => string }) {
  const { selectedCurrency } = useRegion(); const rates = useCurrencyRates();
  const price = Number.isFinite(flight.price) && flight.price > 0 ? formatDisplayPrice({ amount: flight.price, sourceCurrency: flight.currency, displayCurrency: selectedCurrency, convertSourceEstimate: true, rates: rates.rates, isFallbackRate: rates.isFallback }) : null;
  return <article className="flex h-full flex-col rounded-2xl border border-[#D8E1EC] p-5"><div className="flex items-center gap-3">{flight.airlineLogo && <Image src={flight.airlineLogo} alt="" width={36} height={36} className="h-9 w-9 object-contain" />}<div><h3 className="font-extrabold text-slate-950">{flight.airlineName}</h3>{flight.flightNumber && <p className="text-xs text-slate-500">{flight.flightNumber}</p>}</div></div>
    <div className="mt-4 space-y-3">{normalizeFlightLegs(flight).map((leg, index) => { const departure = safeDateTime(leg.departureTime, locale); const arrival = safeDateTime(leg.arrivalTime, locale); return <div key={`${leg.origin}-${index}`} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{t(index === 0 ? "deals.results.outbound" : "deals.results.return")}</p><p dir="ltr" className="mt-1 font-extrabold">{leg.origin} → {leg.destination}</p><p className="mt-1 text-sm text-slate-700">{[departure.date, departure.time, arrival.date, arrival.time].filter(Boolean).join(" · ")}</p><p className="mt-1 text-xs text-slate-500">{leg.duration} · {leg.stops === 0 ? t("direct") : leg.stops === 1 ? t("oneStop") : `${leg.stops} ${t("stopPlural")}`}</p></div>; })}</div>
    <p className="mt-3 text-sm text-slate-600">{flight.cabinClass}{flight.baggageInfo ? ` · ${flight.baggageInfo}` : ""}</p><div className="mt-auto pt-5">{price && <><p className="text-xs font-bold text-slate-500">{t(price.isConvertedEstimate ? "estimatedPrice" : "providerPrice")}</p><p aria-label={price.ariaLabel} title={price.title} className="text-2xl font-extrabold text-[#004BB8]">{price.formatted}</p>{price.isConvertedEstimate && <p className="text-xs text-slate-500">{t("providerPrice")}: {price.providerFormatted}</p>}</>}<Link href={href} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[#004BB8] px-4 py-2 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{t("deals.results.compareFlights")}</Link></div>
  </article>;
}
