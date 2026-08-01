import Link from "next/link";
import { ArrowUpRight, CalendarDays, Car, Check, Hotel, MapPin, Plane } from "lucide-react";
import type { DisplayPrice } from "@/lib/currency/formatCurrency";
import type { DealsHandoffStepView } from "@/lib/deals/dealsHandoffPresentation";

type Props = { step: DealsHandoffStepView; price: DisplayPrice | null; displayCurrency: string; resultsPath: string; onOpen: () => void; t: (key: string) => string };
const icon = { flight: Plane, hotel: Hotel, car: Car };

export function DealsHandoffStepCard({ step, price, displayCurrency, resultsPath, onOpen, t }: Props) {
  const Icon = icon[step.product];
  const title = t(`deals.tripPlan.${step.product === "hotel" ? "stay" : step.product}`);
  const statusKey = step.status === "next" ? "nextToReview" : step.status === "pending" ? "pending" : step.status === "opened" ? "opened" : "refreshRequired";
  const opened = step.status === "opened";
  const cta = t(`deals.handoff.${opened ? `review${step.product === "hotel" ? "Stay" : step.product[0].toUpperCase() + step.product.slice(1)}Again` : `open${step.product === "hotel" ? "Stay" : step.product[0].toUpperCase() + step.product.slice(1)}`}`);
  return <article id={step.id} aria-labelledby={`${step.id}-title`} aria-current={step.status === "next" ? "step" : undefined} className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${step.status === "next" ? "border-[#004BB8] ring-2 ring-blue-100" : step.status === "expired" ? "border-amber-300" : "border-slate-200"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm font-bold text-slate-500">{t("deals.handoff.stepCount").replace("{{position}}", String(step.position)).replace("{{total}}", String(step.total))}</p><h2 id={`${step.id}-title`} className="mt-2 flex items-center gap-3 text-xl font-bold text-slate-950"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#004BB8]"><Icon aria-hidden className="size-5" /></span>{title}</h2></div>
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${opened ? "bg-emerald-50 text-emerald-800" : step.status === "expired" ? "bg-amber-100 text-amber-900" : step.status === "next" ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-700"}`}>{opened && <Check aria-hidden className="size-4" />}{t(`deals.handoff.${statusKey}`)}</span>
    </div>
    <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
        {step.product === "flight" && <><p className="break-words text-lg font-bold text-slate-950">{step.airline}{step.flightNumber ? ` · ${step.flightNumber}` : ""}</p><p dir="ltr" className="mt-3 text-2xl font-bold tracking-wide text-slate-900">{step.routeLabel}</p><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Detail label={t("deals.handoff.departure")} value={step.departureLabel} /><Detail label={t("deals.handoff.arrival")} value={step.arrivalLabel} /></dl><p className="mt-4 text-sm text-slate-600">{step.durationLabel} · {t("deals.handoff.localTimes")}</p></>}
        {step.product === "hotel" && <><p className="break-words text-lg font-bold text-slate-950">{step.name}</p><p className="mt-2 flex items-start gap-2 text-slate-600"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />{step.location}</p><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Detail label={t("deals.handoff.checkIn")} value={step.checkInLabel} /><Detail label={t("deals.handoff.checkOut")} value={step.checkOutLabel} /></dl>{step.nights && <p className="mt-3 text-sm text-slate-600">{t("deals.handoff.nights").replace("{{count}}", String(step.nights))}</p>}{step.roomType && <Detail className="mt-4" label={t("deals.handoff.room")} value={step.roomType} />}</>}
        {step.product === "car" && <><p className="break-words text-lg font-bold text-slate-950">{step.company} · {step.model}</p><p className="mt-2 text-slate-600">{step.category}</p><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Detail label={t("deals.handoff.pickup")} value={`${step.pickupLocation} · ${step.pickupLabel}`} /><Detail label={t("deals.handoff.return")} value={`${step.returnLocation} · ${step.returnLabel}`} /></dl>{step.rentalDays && <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><CalendarDays aria-hidden className="size-4" />{t("deals.handoff.rentalDays").replace("{{count}}", String(step.rentalDays))}</p>}</>}
      </div>
      <div className="min-w-0 border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        {price ? <><p className="text-sm font-semibold text-slate-600">{price.isConvertedEstimate ? t("deals.handoff.estimatedIn").replace("{{currency}}", displayCurrency) : t("deals.handoff.providerPrice")}</p><p aria-label={price.ariaLabel} className="mt-1 break-words text-2xl font-bold leading-tight tabular-nums text-slate-950">{price.formatted}</p>{price.isConvertedEstimate && <p className="mt-2 break-words text-sm tabular-nums text-slate-600">{t("deals.handoff.sourcePrice")}: {price.providerFormatted}</p>}</> : <p className="text-slate-600">{t("deals.handoff.priceUnavailable")}</p>}
        {step.status === "expired" || !step.href ? <div className="mt-5"><p className="text-sm leading-6 text-amber-900">{t(`deals.handoff.${step.product === "hotel" ? "stay" : step.product}Expired`)}</p><Link href={resultsPath} className="mt-3 inline-flex min-h-11 items-center font-bold text-[#004BB8] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{t("deals.handoff.refresh")}</Link></div> : <a href={step.href} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-center font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${step.status === "next" ? "bg-[#004BB8] text-white" : "border border-[#004BB8] text-[#004BB8]"}`}>{cta}<ArrowUpRight aria-hidden className="size-4 shrink-0" /><span className="sr-only">({t("deals.handoff.newTab")})</span></a>}
      </div>
    </div>
  </article>;
}

function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) { return <div className={className}><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold leading-6 text-slate-900">{value}</dd></div>; }
