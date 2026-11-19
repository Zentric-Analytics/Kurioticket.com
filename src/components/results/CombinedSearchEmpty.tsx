"use client";
import { useKayakResults, type ProviderSearchStatus } from "./KayakResultsContext";
import { combinedSearchState } from "./combinedSearchState";

export function CombinedSearchEmpty({ otherStatus, retry, retriesAll = false }: {otherStatus:ProviderSearchStatus;retry:()=>void;retriesAll?:boolean}) {
  const provider = useKayakResults();
  const state = combinedSearchState(0, [otherStatus, provider?.status ?? "success"]);
  const message = state === "loading" ? "Searching for available results…"
    : state === "needs-input" ? "Choose a destination to finish searching."
    : state === "error" ? "We couldn’t complete your search. Please try again."
    : "No results found. Try different search details.";
  return <div className="rounded-xl border border-slate-200 bg-white p-5">
    <p role={state === "error" ? "alert" : "status"}>{message}</p>
    {state === "error" && <button type="button" className="mt-4 rounded border px-4 py-2" onClick={() => { retry(); if (!retriesAll) provider?.retry?.(); }}>Retry search</button>}
  </div>;
}
