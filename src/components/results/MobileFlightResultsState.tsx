"use client";

import { AlertCircle, Search, SlidersHorizontal } from "lucide-react";

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
  return <section data-mobile-flight-results-state={kind} className="flex min-h-[300px] flex-col items-center justify-center px-5 py-10 text-center sm:hidden" aria-labelledby={`mobile-flight-${kind}-title`}>
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#004BB8]/[0.08] text-[#004BB8]" aria-hidden="true"><Icon className="h-5 w-5" /></span>
    <h3 id={`mobile-flight-${kind}-title`} className="mt-4 text-[17px] font-extrabold leading-[22px] text-slate-950">{copy[kind].title}</h3>
    <p className="mt-1.5 max-w-[300px] text-[13px] leading-[18px] text-slate-600">{copy[kind].body}</p>
    <div className="mt-5 flex w-full max-w-[280px] flex-col gap-2.5">
      <button type="button" className="focus-ring h-[46px] rounded-[10px] bg-[#004BB8] px-4 text-sm font-bold text-white hover:bg-[#003D96]" onClick={onPrimary}>{primary}</button>
      {secondary && onSecondary ? <button type="button" className="focus-ring h-[46px] rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50" onClick={onSecondary}>{secondary}</button> : null}
    </div>
  </section>;
}
