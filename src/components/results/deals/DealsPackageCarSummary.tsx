import Link from "next/link";
import { Car } from "lucide-react";
import type { DealsPackageCardView } from "@/lib/deals/dealsPackageCardPresentation";

type Props = { car: NonNullable<DealsPackageCardView["car"]>; headingId: string; t: (key: string) => string };

export function DealsPackageCarSummary({ car, headingId, t }: Props) {
  return <section aria-labelledby={`${headingId}-car`} className="py-4 xl:py-3">
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3"><div className="min-w-0"><h3 id={`${headingId}-car`} className="flex items-center gap-2 text-base font-semibold leading-6 text-slate-950"><Car aria-hidden className="h-4 w-4 text-[#004BB8]" />{t("deals.results.package.car")}</h3><p className="mt-1 break-words text-base font-semibold leading-5 text-slate-950">{car.modelLabel}</p></div>{car.detailsPath && <Link href={car.detailsPath} className="shrink-0 text-sm font-medium text-[#004BB8] hover:underline focus-visible:outline focus-visible:outline-2">{t("deals.results.package.details.car")}</Link>}</div>
    <div className="mt-2 grid gap-x-5 gap-y-1 text-sm leading-5 text-slate-700 sm:grid-cols-2"><p>{car.company} · {car.routeLabel}</p><p>{car.capacityLabel}</p><p>{car.rentalLabel}</p><p>{car.policyLabels.join(" · ")}</p></div>
  </section>;
}
