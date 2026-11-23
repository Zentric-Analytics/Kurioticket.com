"use client";

import { AlertCircle, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type StateKind = "filtered" | "error" | "empty";

const copy = {
  filtered: { title: "No flights match your filters", body: "Try adjusting or clearing your filters." },
  error: { title: "Couldn't load flights", body: "Something went wrong while loading your results." },
  empty: { title: "No flights found", body: "We couldn't find flights for this search." },
} satisfies Record<StateKind, { title: string; body: string }>;

export function MobileFlightResultsState({ kind, onPrimary, onSecondary }: { kind: StateKind; onPrimary: () => void; onSecondary?: () => void }) {
  const Icon = kind === "filtered" ? SlidersHorizontal : kind === "error" ? AlertCircle : Search;
  const primary = kind === "filtered" ? "Clear filters" : kind === "error" ? "Try again" : "Edit search";
  const secondary = kind === "filtered" ? "Adjust filters" : kind === "error" ? "Edit search" : null;
  return <section data-mobile-flight-results-state={kind} className="flex min-h-[210px] flex-col items-center justify-center px-[18px] py-7 text-center sm:hidden" aria-labelledby={`mobile-flight-${kind}-title`} aria-live="polite">
    <span className={cn("flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white", kind === "error" ? "text-slate-500" : "text-[#004BB8]")} aria-hidden="true"><Icon className="h-[21px] w-[21px]" /></span>
    <h3 id={`mobile-flight-${kind}-title`} className="mt-3 text-[17px] font-extrabold leading-[22px] text-slate-950">{copy[kind].title}</h3>
    <p className="mt-1 max-w-[300px] text-[13px] leading-[18px] text-slate-600">{copy[kind].body}</p>
    <div className="mt-[18px] flex w-full max-w-[280px] flex-col gap-[9px]">
      <button type="button" className="focus-ring h-[46px] rounded-[10px] bg-[#004BB8] px-4 text-sm font-bold text-white hover:bg-[#003D96]" onClick={onPrimary}>{primary}</button>
      {secondary && onSecondary ? <button type="button" className="focus-ring h-[46px] rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50" onClick={onSecondary}>{secondary}</button> : null}
    </div>
  </section>;
}
