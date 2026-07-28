"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { DealsSearchForm } from "@/components/search/DealsSearchForm";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";

export function DealsInlineSearchEditor({ search, t, onSubmit, onCancel, onDraftChange, warning }: { search: DealsSearch; t: (key: string) => string; onSubmit: (search: DealsSearch) => void; onCancel: () => void; onDraftChange: (search: DealsSearch) => void; warning?: ReactNode }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { const heading = headingRef.current; if (!heading) return; heading.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); heading.focus({ preventScroll: true }); }, []);
  return <section id="deals-search-editor" aria-labelledby="deals-search-editor-title" className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6"><h2 ref={headingRef} tabIndex={-1} id="deals-search-editor-title" className="text-xl font-extrabold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]">{t("deals.results.editor.title")}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t("deals.results.editor.description")}</p><div className="mt-4"><DealsSearchForm initialSearch={search} variant="results" onSubmitSearch={onSubmit} onCancel={onCancel} onDraftChange={onDraftChange} warning={warning} /></div></section>;
}
