import Link from "next/link";
import { Car } from "lucide-react";
import type { DealsPackageCardView } from "@/lib/deals/dealsPackageCardPresentation";

type Props = { car: NonNullable<DealsPackageCardView["car"]>; headingId: string; t: (key: string) => string };

export function DealsPackageCarSummary({ car, headingId, t }: Props) {
  return <section aria-labelledby={`${headingId}-car`} className="py-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 id={`${headingId}-car`} className="flex items-center gap-2 text-sm font-extrabold"><Car aria-hidden className="h-4 w-4 text-[#004BB8]" />{t("deals.results.package.car")}</h3><p className="mt-1 font-bold">{car.modelLabel}</p></div>{car.detailsPath && <Link href={car.detailsPath} className="shrink-0 text-xs font-semibold text-[#004BB8] hover:underline focus-visible:outline focus-visible:outline-2">{t("deals.results.package.details.car")}</Link>}</div>
    <div className="mt-2 grid gap-x-5 gap-y-1 text-sm text-slate-600 sm:grid-cols-2"><p>{car.company} · {car.routeLabel}</p><p>{car.capacityLabel}</p><p>{car.rentalLabel}</p><p>{car.policyLabels.join(" · ")}</p></div>
  </section>;
}
