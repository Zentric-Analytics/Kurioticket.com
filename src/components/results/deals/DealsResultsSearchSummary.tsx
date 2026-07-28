import type { Ref } from "react";
import { CalendarDays, MapPin, Users } from "lucide-react";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { getDealsResultsSummary } from "@/lib/deals/dealsResultsPresentation";

type Props = {
  search: DealsSearch;
  locale: string;
  t: (key: string) => string;
  modeLabel: string;
  onModify: () => void;
  modifyExpanded: boolean;
  modifyButtonRef?: Ref<HTMLButtonElement>;
};

export function DealsResultsSearchSummary({ search, locale, t, modeLabel, onModify, modifyExpanded, modifyButtonRef }: Props) {
  const summary = getDealsResultsSummary(search, locale);
  const context = [
    summary.travelers !== undefined ? `${summary.travelers} ${t(summary.travelers === 1 ? "deals.results.traveler" : "deals.results.travelers")}` : null,
    summary.guests !== undefined ? `${summary.guests} ${t(summary.guests === 1 ? "deals.results.guest" : "deals.results.guests")}` : null,
    summary.rooms !== undefined ? `${summary.rooms} ${t(summary.rooms === 1 ? "deals.results.room" : "deals.results.rooms")}` : null,
    summary.cabin ? t(`deals.cabin.${summary.cabin}`) : null,
    summary.carIncluded ? t("deals.results.summary.carIncluded") : null,
  ].filter(Boolean).join(" · ");
  const dates = summary.dates.map((item) => `${item.labelKey ? `${t(item.labelKey)}: ` : ""}${item.value}`).join(" · ");

  return <section aria-label={t("deals.results.summary.currentSearch")} className="sticky top-0 z-50 border-b border-slate-200/70 bg-white sm:static sm:z-auto sm:pt-7">
    <div className="bg-white px-4 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.06)] sm:px-0 sm:py-0 sm:shadow-none">
      <div className="page-shell px-0 sm:px-4">
        <div className="grid min-h-[68px] min-w-0 grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-[0_12px_30px_-22px_rgba(15,23,42,0.45)] sm:relative sm:z-10 sm:translate-y-5 sm:grid-cols-[minmax(120px,0.7fr)_minmax(190px,1.4fr)_minmax(180px,1.1fr)_minmax(180px,1.15fr)_auto] sm:rounded-lg">
          <SummaryCell label={t("deals.results.summary.package")} value={modeLabel} className="hidden sm:flex" />
          <SummaryCell label={t(summary.routeLabelKey)} value={summary.primary} icon={<MapPin aria-hidden />} dir={summary.hasFlight ? "ltr" : undefined} className="border-e-0 sm:border-e" />
          <SummaryCell label={t("deals.results.summary.travelDates")} value={dates} icon={<CalendarDays aria-hidden />} className="hidden sm:flex" />
          <SummaryCell label={t("deals.results.summary.travelParty")} value={context} icon={<Users aria-hidden />} className="hidden sm:flex" />
          <div className="flex items-center px-2 sm:px-3">
            <button ref={modifyButtonRef} type="button" onClick={onModify} aria-expanded={modifyExpanded} aria-controls="deals-modify-search-dialog" className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#004BB8] px-3 text-sm font-bold text-white transition hover:bg-[#021C2B] sm:px-4">{t("deals.results.modify")}</button>
          </div>
          <div className="col-span-2 flex min-w-0 items-center gap-2 border-t border-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:hidden">
            <CalendarDays aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#004BB8]" />
            <span className="truncate">{dates} · {modeLabel}{summary.carIncluded ? ` · ${t("deals.results.summary.carIncluded")}` : ""}</span>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

function SummaryCell({ label, value, icon, dir, className = "" }: { label: string; value: string; icon?: React.ReactNode; dir?: "ltr"; className?: string }) {
  return <div className={`min-w-0 items-center gap-2 border-e border-slate-200/85 px-3 py-2.5 ${className}`}>
    {icon ? <span className="shrink-0 text-[#004BB8] [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
    <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span><span dir={dir} className="block truncate text-sm font-semibold text-slate-900">{value}</span></span>
  </div>;
}
