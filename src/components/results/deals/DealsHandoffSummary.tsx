type Props = { modeLabel: string; opened: number; total: number; totalLabel: string | null; progressLabel: string; allOpened: boolean; hasExpired: boolean; t: (key: string) => string };

type OpenLineSide = "left" | "right";
type OpenLineTurn = "top" | "bottom";

function OpenSectionLine({ side, turn }: { side: OpenLineSide; turn: OpenLineTurn }) {
  const originClasses = {
    "left-top": "start-0 top-0 border-s border-t rounded-ss-2xl",
    "left-bottom": "start-0 bottom-0 border-s border-b rounded-es-2xl",
    "right-top": "end-0 top-0 border-e border-t rounded-se-2xl",
    "right-bottom": "end-0 bottom-0 border-e border-b rounded-ee-2xl",
  }[`${side}-${turn}`];

  return <div className="pointer-events-none relative h-5 select-none overflow-visible" aria-hidden="true">
    <span className={`absolute h-5 w-[calc(100%-2rem)] border-slate-300/80 sm:w-[calc(100%-2.5rem)] ${originClasses}`} />
  </div>;
}

export function DealsHandoffSummary({ modeLabel, opened, total, totalLabel, progressLabel, allOpened, hasExpired, t }: Props) {
  const percent = total ? Math.round(opened / total * 100) : 0;
  return <aside aria-labelledby="trip-summary-title" className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-24">
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-none">
      <div className="p-5 pb-3 sm:p-6 sm:pb-4">
        <h2 id="trip-summary-title" className="text-xl font-bold text-slate-950">{t("deals.handoff.tripSummary")}</h2>
        <p className="mt-2 font-semibold text-slate-700">{modeLabel}</p>
      </div>
      <OpenSectionLine side="right" turn="bottom" />
      <div className="p-5 pt-3 sm:p-6 sm:pt-4">
        <p className="text-sm font-semibold leading-5 text-slate-700">{allOpened ? t("deals.handoff.allPagesOpened") : progressLabel}</p>
        <div role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={total} aria-valuenow={opened} className="mt-2 h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-[#004BB8]" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <OpenSectionLine side="left" turn="bottom" />
      <div className="p-5 pt-3 sm:p-6 sm:pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("deals.handoff.estimatedCombinedTotal")}</p>
        <p className="mt-1 break-words text-2xl font-bold tracking-tight tabular-nums text-slate-950" dir="ltr">{totalLabel ?? t("deals.handoff.combinedEstimateUnavailable")}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">{t("deals.handoff.estimateDisclosure")}</p>
      </div>
      <OpenSectionLine side="right" turn="top" />
      <div className="space-y-4 p-5 pt-3 sm:p-6 sm:pt-4">
        <p className={hasExpired ? "text-sm font-medium leading-6 text-amber-800" : "text-sm leading-6 text-slate-600"}>{hasExpired ? t("deals.handoff.summaryRefreshRequired") : t("deals.handoff.openingDoesNotBook")}</p>
      </div>
    </div>
  </aside>;
}
