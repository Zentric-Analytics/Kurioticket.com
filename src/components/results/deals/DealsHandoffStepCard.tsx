import Link from "next/link";
import { ArrowUpRight, CalendarDays, Car, Check, Hotel, MapPin, Plane } from "lucide-react";
import type { DisplayPrice } from "@/lib/currency/formatCurrency";
import type { DealsHandoffStepView } from "@/lib/deals/dealsHandoffPresentation";

type Props = { step: DealsHandoffStepView; price: DisplayPrice | null; displayCurrency: string; resultsPath: string; onOpen: () => boolean | void; onRecoveryNavigation?: () => void; t: (key: string) => string; unavailableHref?: string; unavailableLabel?: string; unavailableBody?: string };
const icon = { flight: Plane, hotel: Hotel, car: Car };

export function DealsHandoffStepCard({ step, price, displayCurrency, resultsPath, onOpen, onRecoveryNavigation, t, unavailableHref, unavailableLabel, unavailableBody }: Props) {
  const Icon = icon[step.product];
  const title = t(`deals.tripPlan.${step.product === "hotel" ? "stay" : step.product}`);
  const statusKey = step.status === "next" ? "nextToReview" : step.status === "pending" ? "pending" : step.status === "opened" ? "opened" : "refreshRequired";
  const opened = step.status === "opened";
  const cta = t(step.actionKind === "provider-handoff"
    ? "deals.handoff.continueToProvider"
    : step.product === "hotel"
      ? opened ? "deals.handoff.reviewStayAgain" : "deals.handoff.openStay"
      : opened ? "deals.handoff.reviewCarAgain" : "deals.handoff.openCar");

  return <article id={step.id} aria-labelledby={`${step.id}-title`} aria-current={step.status === "next" ? "step" : undefined} className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${step.status === "next" ? "border-[#004BB8] ring-2 ring-blue-100" : step.status === "expired" ? "border-amber-300" : "border-slate-200"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium leading-5 text-slate-500">{t("deals.handoff.stepCount").replace("{{position}}", String(step.position)).replace("{{total}}", String(step.total))}</p>
        <h2 id={`${step.id}-title`} className="mt-2 flex items-center gap-3 text-xl font-semibold leading-7 text-slate-950"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#004BB8]"><Icon aria-hidden className="size-5" /></span>{title}</h2>
      </div>
      <span className={`inline-flex whitespace-nowrap items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ${opened ? "bg-emerald-50 text-emerald-800" : step.status === "expired" ? "bg-amber-100 text-amber-900" : step.status === "next" ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-700"}`}>{opened && <Check aria-hidden className="size-4" />}{t(`deals.handoff.${statusKey}`)}</span>
    </div>
    <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-6">
      <div className="min-w-0">
        {step.product === "flight" && <>
          <p className="text-lg font-semibold leading-7 text-slate-950">{step.airline}{step.flightNumber ? <span className="whitespace-nowrap"> · {step.flightNumber}</span> : null}</p>
          <p dir="ltr" className="mt-2 text-2xl font-semibold leading-8 tracking-wide text-slate-900"><span className="whitespace-nowrap">{step.routeLabel}</span></p>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2"><Detail label={t("deals.handoff.departure")} value={step.departureLabel} /><Detail label={t("deals.handoff.arrival")} value={step.arrivalLabel} /></dl>
          <p className="mt-4 text-sm leading-6 text-slate-600">{step.durationLabel} · {t("deals.handoff.localTimes")}</p>
        </>}
        {step.product === "hotel" && <>
          <p className="text-lg font-semibold leading-7 text-slate-950">{step.name}</p>
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-600"><MapPin aria-hidden className="mt-1 size-4 shrink-0" />{step.location}</p>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2"><Detail label={t("deals.handoff.checkIn")} value={step.checkInLabel} /><Detail label={t("deals.handoff.checkOut")} value={step.checkOutLabel} /></dl>
          {step.nights && <p className="mt-3 text-sm leading-6 text-slate-600">{t("deals.handoff.nights").replace("{{count}}", String(step.nights))}</p>}
          {step.roomType && <dl className="mt-4"><Detail label={t("deals.handoff.room")} value={step.roomType} /></dl>}
        </>}
        {step.product === "car" && <>
          <p className="text-lg font-semibold leading-7 text-slate-950">{step.company} · {step.model}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{step.category}</p>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2"><Detail label={t("deals.handoff.pickup")} value={`${step.pickupLocation} · ${step.pickupLabel}`} /><Detail label={t("deals.handoff.return")} value={`${step.returnLocation} · ${step.returnLabel}`} /></dl>
          {step.rentalDays && <p className="mt-3 flex items-center gap-2 text-sm leading-6 text-slate-600"><CalendarDays aria-hidden className="size-4 shrink-0" />{t("deals.handoff.rentalDays").replace("{{count}}", String(step.rentalDays))}</p>}
        </>}
      </div>
      <div className="min-w-0 border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        {price ? <>
          <p className="text-sm font-medium leading-5 text-slate-600">{price.isConvertedEstimate ? t("deals.handoff.estimatedIn").replace("{{currency}}", displayCurrency) : t("deals.handoff.providerPrice")}</p>
          <p aria-label={price.ariaLabel} className="mt-1 text-xl font-semibold leading-7 tracking-tight tabular-nums text-slate-950"><span dir="ltr" className="inline-block whitespace-nowrap">{price.formatted}</span></p>
          {price.isConvertedEstimate && <p className="mt-2 text-sm leading-5 text-slate-600">{t("deals.handoff.sourcePrice")}: {" "}<span dir="ltr" className="whitespace-nowrap font-medium tabular-nums">{price.providerFormatted}</span></p>}
        </> : <p className="text-slate-600">{t("deals.handoff.priceUnavailable")}</p>}
        {step.status === "expired" || !step.href ? <div className="mt-5"><p className="text-sm leading-6 text-amber-900">{!step.href && unavailableBody ? unavailableBody : t(`deals.handoff.${step.product === "hotel" ? "stay" : step.product}Expired`)}</p><Link href={unavailableHref ?? resultsPath} onClick={onRecoveryNavigation} className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#004BB8] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{unavailableLabel ?? t("deals.handoff.refresh")}</Link></div> : <a href={step.href} id={`${step.id}-action`} target="_blank" rel="noopener noreferrer" onClick={(event) => { if (onOpen() === false) event.preventDefault(); }} className={`mt-5 inline-flex min-h-11 w-full whitespace-nowrap items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${step.status === "next" ? "bg-[#004BB8] text-white" : "border border-[#004BB8] text-[#004BB8]"}`}>{cta}<ArrowUpRight aria-hidden className="size-4 shrink-0" /><span className="sr-only">({t("deals.handoff.newTab")})</span></a>}
      </div>
    </div>
  </article>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-sm font-medium leading-5 text-slate-500">{label}</dt><dd className="mt-1 font-medium leading-6 text-slate-900">{value}</dd></div>;
}
