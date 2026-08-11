"use client";

import { useEffect, useRef, useState, type MouseEvent, type MutableRefObject } from "react";
import { CalendarDays, MapPin, PencilLine, Users } from "lucide-react";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { getDealsResultsSummary } from "@/lib/deals/dealsResultsPresentation";
import { shouldShowDesktopStickySearch } from "@/lib/search/desktopStickySearch";
import { cn } from "@/lib/utils";

type Props = {
  search: DealsSearch;
  locale: string;
  t: (key: string) => string;
  modeLabel: string;
  onModify: () => void;
  modifyExpanded: boolean;
  modifyButtonRef: MutableRefObject<HTMLButtonElement | null>;
};

export function DealsResultsSearchSummary({ search, locale, t, modeLabel, onModify, modifyExpanded, modifyButtonRef }: Props) {
  const visibleSummaryRef = useRef<HTMLDivElement>(null);
  const [desktopStickyVisible, setDesktopStickyVisible] = useState(false);
  const summary = getDealsResultsSummary(search, locale);
  const context = [
    summary.travelers !== undefined ? `${summary.travelers} ${t(summary.travelers === 1 ? "deals.results.traveler" : "deals.results.travelers")}` : null,
    summary.guests !== undefined ? `${summary.guests} ${t(summary.guests === 1 ? "deals.results.guest" : "deals.results.guests")}` : null,
    summary.rooms !== undefined ? `${summary.rooms} ${t(summary.rooms === 1 ? "deals.results.room" : "deals.results.rooms")}` : null,
    summary.cabin ? t(`deals.cabin.${summary.cabin}`) : null,
    summary.carIncluded ? t("deals.results.summary.carIncluded") : null,
  ].filter(Boolean).join(" · ");
  const dates = summary.dates.map((item) => `${item.labelKey ? `${t(item.labelKey)}: ` : ""}${item.value}`).join(" · ");
  const mobileDetails = [dates, modeLabel, context].filter(Boolean).join(" · ");
  const packageAndParty = [modeLabel, context].filter(Boolean).join(" · ");
  const packageAndPartyLabel = `${t("deals.results.summary.package")} · ${t("deals.results.summary.travelParty")}`;

  useEffect(() => {
    const surface = visibleSummaryRef.current;
    if (!surface) return undefined;

    let animationFrame = 0;
    let previous: boolean | null = null;

    const measure = () => {
      animationFrame = 0;
      const visibleSummaryBottom = surface.getBoundingClientRect().bottom;
      const next = shouldShowDesktopStickySearch({
        viewportWidth: window.innerWidth,
        formBottom: visibleSummaryBottom,
      });

      if (next !== previous) {
        previous = next;
        setDesktopStickyVisible(next);
      }
    };
    const schedule = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(measure);
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(schedule);

    observer?.observe(surface);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const handleModify = (event: MouseEvent<HTMLButtonElement>) => {
    modifyButtonRef.current = event.currentTarget;
    onModify();
  };

  return <>
    <section aria-label={t("deals.results.summary.currentSearch")} className="sticky top-0 z-50 border-b border-slate-200/70 bg-white sm:static sm:z-auto sm:pt-7">
      <div className="bg-white px-3 py-2 shadow-[0_4px_14px_rgba(15,23,42,0.06)] sm:px-0 sm:py-0 sm:shadow-none">
        <div className="page-shell px-0 sm:px-4">
          <div ref={visibleSummaryRef} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-[0_12px_30px_-22px_rgba(15,23,42,0.45)] sm:relative sm:z-10 sm:translate-y-5 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1.15fr)_auto] sm:rounded-lg lg:min-h-[80px] lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.15fr)_auto] lg:rounded-2xl lg:border-slate-200 lg:shadow-[0_18px_42px_-28px_rgba(15,23,42,0.45)]">
            <button data-deals-summary-trigger="inline" type="button" onClick={handleModify} aria-label={t("deals.results.modify")} aria-expanded={modifyExpanded} aria-controls="deals-modify-search-dialog" className="col-span-1 grid min-w-0 cursor-pointer grid-cols-1 text-start hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30 sm:col-span-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1.15fr)] lg:col-span-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.15fr)]">
            <div className="flex min-w-0 items-center gap-2.5 px-3 py-2 sm:hidden">
              <MapPin aria-hidden className="h-4 w-4 shrink-0 text-[#004BB8]" />
              <span className="min-w-0">
                <span dir={summary.hasFlight ? "ltr" : undefined} title={summary.primary} className="block min-w-0 truncate text-sm font-bold leading-tight text-slate-900">{summary.primary}</span>
                <span title={mobileDetails} className="mt-0.5 block min-w-0 truncate text-xs font-medium leading-tight text-slate-600">{mobileDetails}</span>
              </span>
            </div>
            <SummaryCell variant="inline" label={t("deals.results.summary.package")} value={modeLabel} className="hidden lg:flex" />
            <SummaryCell variant="inline" label={t(summary.routeLabelKey)} value={summary.primary} icon={<MapPin aria-hidden />} dir={summary.hasFlight ? "ltr" : undefined} className="hidden sm:flex" />
            <SummaryCell variant="inline" label={t("deals.results.summary.travelDates")} value={dates} icon={<CalendarDays aria-hidden />} className="hidden sm:flex" />
            <SummaryCell variant="inline" label={packageAndPartyLabel} value={packageAndParty} icon={<Users aria-hidden />} className="hidden sm:flex lg:hidden" />
            <SummaryCell variant="inline" label={t("deals.results.summary.travelParty")} value={context} icon={<Users aria-hidden />} className="hidden lg:flex" />
            </button>
            <div className="flex shrink-0 items-center px-2 sm:px-3 lg:px-4">
              <button ref={modifyButtonRef} type="button" onClick={handleModify} aria-label={t("deals.results.modify")} title={t("deals.results.modify")} aria-expanded={modifyExpanded} aria-controls="deals-modify-search-dialog" className="focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-[#004BB8] px-2 text-sm font-bold text-white transition hover:bg-[#021C2B] sm:min-w-0 sm:px-4 lg:min-h-[52px] lg:rounded-xl lg:px-6 lg:text-base">
                <PencilLine aria-hidden="true" className="h-5 w-5 sm:hidden" />
                <span className="hidden sm:inline">{t("deals.results.modify")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[1000] hidden px-4 transition-all duration-200 motion-reduce:transition-none lg:block",
        desktopStickyVisible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
      )}
      aria-hidden={!desktopStickyVisible}
      inert={!desktopStickyVisible ? true : undefined}
    >
      <div className={cn(
        "mx-auto grid h-[58px] w-full max-w-[920px] grid-cols-[minmax(110px,0.7fr)_minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(190px,1.25fr)_auto] overflow-hidden rounded-lg border border-slate-200/95 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.38)] ring-1 ring-slate-950/[0.03]",
        desktopStickyVisible ? "pointer-events-auto" : "pointer-events-none",
      )}>
        <button data-deals-summary-trigger="sticky" type="button" onClick={handleModify} aria-label={t("deals.results.modify")} aria-expanded={modifyExpanded} aria-controls="deals-modify-search-dialog" className="col-span-4 grid min-w-0 cursor-pointer grid-cols-[minmax(110px,0.7fr)_minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(190px,1.25fr)] text-start hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30">
        <SummaryCell variant="compact" label={t("deals.results.summary.package")} value={modeLabel} className="flex" />
        <SummaryCell variant="compact" label={t(summary.routeLabelKey)} value={summary.primary} icon={<MapPin aria-hidden />} dir={summary.hasFlight ? "ltr" : undefined} className="flex" />
        <SummaryCell variant="compact" label={t("deals.results.summary.travelDates")} value={dates} icon={<CalendarDays aria-hidden />} className="flex" />
        <SummaryCell variant="compact" label={t("deals.results.summary.travelParty")} value={context} icon={<Users aria-hidden />} className="flex" />
        </button>
        <div className="flex items-center px-3">
          <button type="button" onClick={handleModify} aria-expanded={modifyExpanded} aria-controls="deals-modify-search-dialog" className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#004BB8] px-4 text-sm font-bold text-white transition hover:bg-[#021C2B]">{t("deals.results.modify")}</button>
        </div>
      </div>
    </div>
  </>;
}

type SummaryCellVariant = "inline" | "compact";

function SummaryCell({ label, value, icon, dir, className = "", variant }: { label: string; value: string; icon?: React.ReactNode; dir?: "ltr"; className?: string; variant: SummaryCellVariant }) {
  const isInline = variant === "inline";

  return <span className={cn("min-w-0 items-center gap-2 border-e border-slate-200/85 px-3", isInline ? "py-2 lg:gap-3 lg:px-5 lg:py-3.5" : "h-[56px]", className)}>
    {icon ? <span className={cn("shrink-0 text-[#004BB8] [&>svg]:h-4 [&>svg]:w-4", isInline && "lg:[&>svg]:h-5 lg:[&>svg]:w-5")}>{icon}</span> : null}
    {isInline ? (
      <span className="min-w-0"><span title={label} className="block truncate text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-slate-500 lg:text-[11px] lg:tracking-[0.11em]">{label}</span><span title={value} dir={dir} className="block truncate text-sm font-semibold leading-tight text-slate-900 lg:mt-1 lg:text-base lg:leading-6">{value}</span></span>
    ) : (
      <span className="min-w-0"><span className="sr-only">{label}: </span><span title={value} dir={dir} className="block min-w-0 truncate whitespace-nowrap text-[0.86rem] font-medium leading-5 text-slate-800">{value}</span></span>
    )}
  </span>;
}
