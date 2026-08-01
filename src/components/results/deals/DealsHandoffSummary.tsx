import { ArrowDown } from "lucide-react";

type Props = { modeLabel: string; opened: number; total: number; totalLabel: string | null; progressLabel: string; allOpened: boolean; hasExpired: boolean; nextId: string | null; t: (key: string) => string };

export function DealsHandoffSummary({ modeLabel, opened, total, totalLabel, progressLabel, allOpened, hasExpired, nextId, t }: Props) {
  const percent = total ? Math.round(opened / total * 100) : 0;
  return <aside aria-labelledby="trip-summary-title" className="order-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:order-2 xl:sticky xl:top-24">
    <h2 id="trip-summary-title" className="text-xl font-bold text-slate-950">{t("deals.handoff.tripSummary")}</h2>
    <p className="mt-2 font-semibold text-slate-700">{modeLabel}</p>
    <div className="mt-5">
      <p className="text-sm font-semibold text-slate-700">{allOpened ? t("deals.handoff.allPagesOpened") : progressLabel}</p>
      <div role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={total} aria-valuenow={opened} className="mt-2 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-[#004BB8]" style={{ width: `${percent}%` }} />
      </div>
    </div>
    <div className="mt-6 border-t border-slate-200 pt-5">
      <p className="text-sm font-semibold text-slate-600">{t("deals.handoff.estimatedCombinedTotal")}</p>
      <p className="mt-1 break-words text-2xl font-bold tabular-nums text-slate-950">{totalLabel ?? t("deals.handoff.combinedEstimateUnavailable")}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("deals.handoff.estimateDisclosure")}</p>
    </div>
    <p className={`mt-5 rounded-xl p-3 text-sm leading-6 ${hasExpired ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-slate-700"}`}>{hasExpired ? t("deals.handoff.summaryRefreshRequired") : t("deals.handoff.openingDoesNotBook")}</p>
    {nextId && <a href={`#${nextId}`} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-[#004BB8] underline decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><ArrowDown aria-hidden className="size-4" />{t("deals.handoff.goToNextStep")}</a>}
  </aside>;
}
