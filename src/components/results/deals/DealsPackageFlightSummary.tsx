import Link from "next/link";
import { Plane } from "lucide-react";
import type { DealsPackageCardView } from "@/lib/deals/dealsPackageCardPresentation";

type Props = { flight: NonNullable<DealsPackageCardView["flight"]>; headingId: string; t: (key: string) => string };

export function DealsPackageFlightSummary({ flight, headingId, t }: Props) {
  return (
    <section aria-labelledby={`${headingId}-flight`} className="py-4 xl:py-3">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 id={`${headingId}-flight`} className="flex items-center gap-2 text-base font-semibold leading-6 text-slate-950">
            <Plane aria-hidden className="h-4 w-4 text-[#004BB8]" />
            {t("deals.results.package.flight")}
          </h3>
          <p className="mt-1 text-sm font-medium leading-5 text-slate-700">{flight.airlineLabel}</p>
        </div>
        {flight.detailsPath && <Link href={flight.detailsPath} className="shrink-0 text-sm font-medium text-[#004BB8] hover:underline focus-visible:outline focus-visible:outline-2">{t("deals.results.package.details.flight")}</Link>}
      </div>
      <div className="mt-2 grid gap-x-6 gap-y-2 md:grid-cols-2">
        {flight.legs.map((leg, index) => (
          <div key={`${leg.direction}-${index}`} className="min-w-0 border-s-2 border-blue-100 ps-3">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#0056B3]">{leg.direction === "return" ? t("deals.results.package.return") : leg.direction === "outbound" ? t("deals.results.package.outbound") : t("deals.results.package.leg")}</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className="break-words text-base font-semibold leading-6 text-slate-950" dir="ltr">{leg.routeLabel}</p>
              <p className="text-sm leading-5 text-slate-600">{leg.duration} · {leg.stops === 0 ? t("deals.results.package.nonstop") : `${leg.stops} ${leg.stops === 1 ? "stop" : "stops"}`}</p>
            </div>
            <p className="mt-0.5 text-sm leading-5 text-slate-700">{leg.scheduleLabel}</p>
            {leg.layoverLabel && <p className="mt-0.5 text-[13px] leading-5 text-slate-600">{t("deals.results.package.layovers")}: {leg.layoverLabel}</p>}
          </div>
        ))}
      </div>
      {flight.cabinAndBaggageLabel && <p className="mt-2 text-[13px] leading-5 text-slate-600">{flight.cabinAndBaggageLabel}</p>}
    </section>
  );
}
