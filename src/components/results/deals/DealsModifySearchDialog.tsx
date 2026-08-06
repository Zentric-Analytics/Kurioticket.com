"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { DealsSearchForm } from "@/components/search/DealsSearchForm";
import { getIncludedProducts, type DealsSearch } from "@/lib/deals/dealsSearchParams";
import { getOverviewData } from "@/lib/deals/dealsResultsPresentation";

const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const dealsChildOverlaySelector = '[data-deals-destination-popover],[data-deals-flight-dates-popover],[data-deals-flight-travellers-popover],[data-deals-hotel-dates-popover],[data-deals-hotel-guests-popover],[data-deals-car-dates-popover],[data-deals-car-times-popover],[data-deals-car-return-location-popover]';

function lockBodyScroll() {
  const body = document.body; const root = document.documentElement; const scrollY = window.scrollY;
  const bodyStyle = body.getAttribute("style"); const rootStyle = root.getAttribute("style");
  Object.assign(body.style, { left: "0", overflow: "hidden", overscrollBehavior: "none", position: "fixed", right: "0", top: `-${scrollY}px`, touchAction: "none", width: "100%" });
  root.style.overflow = "hidden"; root.style.overscrollBehavior = "none";
  return () => { if (bodyStyle === null) body.removeAttribute("style"); else body.setAttribute("style", bodyStyle); if (rootStyle === null) root.removeAttribute("style"); else root.setAttribute("style", rootStyle); window.scrollTo(0, scrollY); };
}

export function DealsModifySearchDialog({ search, locale, t, onSubmit, onClose, onDraftChange, warning, pending = false }: { search: DealsSearch; locale: string; t: (key: string) => string; onSubmit: (search: DealsSearch) => void; onClose: () => void; onDraftChange: (search: DealsSearch) => void; warning?: ReactNode; pending?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null); const closeRef = useRef<HTMLButtonElement>(null);
  const included = getIncludedProducts(search.mode); const overview = getOverviewData(search, locale);
  const title = included.flight ? overview.flight.title : `${overview.hotel.title} ${t("deals.results.editor.tripSuffix")}`;
  const details = [included.flight && `${overview.flight.dates} · ${overview.flight.travelers} ${t(overview.flight.travelers === 1 ? "deals.results.traveler" : "deals.results.travelers")}`, included.hotel && `${overview.hotel.guests} ${t("deals.results.guests")} · ${overview.hotel.rooms} ${t("deals.results.rooms")}`, included.car && t("deals.results.editor.carIncluded")].filter(Boolean).join(" · ");
  useEffect(() => { const restore = lockBodyScroll(); requestAnimationFrame(() => closeRef.current?.focus()); return restore; }, []);
  const hasOpenChild = useCallback(() => Boolean(document.querySelector(dealsChildOverlaySelector) || panelRef.current?.querySelector('[aria-expanded="true"][aria-haspopup]')), []);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { if (hasOpenChild()) return; event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key !== "Tab") return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(focusable)).filter((node) => (panelRef.current?.contains(node) || node.closest(dealsChildOverlaySelector)) && !node.closest('[aria-hidden="true"]'));
    if (!nodes.length) return; const first = nodes[0]; const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const backdropClose = (event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) onClose(); };
  return <div className="fixed inset-0 z-[900] flex items-center justify-center overflow-hidden bg-slate-950/45 p-0 sm:p-6 lg:p-8" onMouseDown={backdropClose} onKeyDown={onKeyDown}>
    <div ref={panelRef} id="deals-modify-search-dialog" role="dialog" aria-modal="true" aria-labelledby="deals-modify-search-dialog-title" className="flex h-[100dvh] w-full max-w-[1180px] flex-col overflow-hidden bg-white shadow-[0_30px_90px_rgba(2,28,43,0.35)] sm:h-auto sm:max-h-[calc(100dvh-48px)] sm:rounded-3xl sm:ring-1 sm:ring-slate-950/10">
      <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#004BB8]">{t("deals.results.editor.eyebrow")}</p><h2 id="deals-modify-search-dialog-title" className="mt-1 truncate text-xl font-extrabold text-slate-950 sm:text-2xl" dir={included.flight ? "ltr" : undefined}>{title}</h2><p className="mt-1 truncate text-sm font-medium text-slate-600">{details}</p></div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t("deals.results.editor.close")} className="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"><X aria-hidden className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 sm:px-2"><DealsSearchForm initialSearch={search} variant="results" onSubmitSearch={onSubmit} onDraftChange={onDraftChange} warning={warning} pending={pending} /></div>
    </div>
  </div>;
}
