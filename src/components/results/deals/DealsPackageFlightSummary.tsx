import Link from "next/link";
import { Plane } from "lucide-react";
import type { DealsPackageCardView } from "@/lib/deals/dealsPackageCardPresentation";

type Props = { flight: NonNullable<DealsPackageCardView["flight"]>; headingId: string; t: (key: string) => string };

export function DealsPackageFlightSummary({ flight, headingId, t }: Props) {
  return (
    <section aria-labelledby={`${headingId}-flight`} className="py-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`${headingId}-flight`} className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
            <Plane aria-hidden className="h-4 w-4 text-[#004BB8]" />
            {t("deals.results.package.flight")}
          </h3>
          <p className="mt-1 truncate text-sm font-semibold text-slate-700">{flight.airlineLabel}</p>
        </div>
        {flight.detailsPath && <Link href={flight.detailsPath} className="shrink-0 text-xs font-semibold text-[#004BB8] hover:underline focus-visible:outline focus-visible:outline-2">{t("deals.results.package.details.flight")}</Link>}
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-2">
        {flight.legs.map((leg, index) => (
          <div key={`${leg.direction}-${index}`} className="min-w-0 border-s-2 border-blue-100 ps-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#0056B3]">{leg.direction === "return" ? t("deals.results.package.return") : leg.direction === "outbound" ? t("deals.results.package.outbound") : t("deals.results.package.leg")}</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className="font-extrabold text-slate-950" dir="ltr">{leg.routeLabel}</p>
              <p className="text-xs text-slate-600">{leg.duration} · {leg.stops === 0 ? t("deals.results.package.nonstop") : `${leg.stops} ${leg.stops === 1 ? "stop" : "stops"}`}</p>
            </div>
            <p className="mt-0.5 text-sm text-slate-700">{leg.scheduleLabel}</p>
            {leg.layoverLabel && <p className="mt-0.5 text-xs text-slate-500">{t("deals.results.package.layovers")}: {leg.layoverLabel}</p>}
          </div>
        ))}
      </div>
      {flight.cabinAndBaggageLabel && <p className="mt-3 text-xs text-slate-500">{flight.cabinAndBaggageLabel}</p>}
    </section>
  );
}
