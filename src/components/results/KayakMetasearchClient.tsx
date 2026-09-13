"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { KayakResultsContext } from "./KayakResultsContext";
import type { KayakVertical, SandboxOffer, SandboxPlace } from "@/services/travel/kayakSandbox";
import { KayakResultCard } from "./KayakResultCard";

export function KayakMetasearchClient({ vertical, criteria: inputCriteria, children }: {
  vertical: KayakVertical; criteria: Record<string, string>; children?: ReactNode;
}) {
  const criteriaKey = JSON.stringify(inputCriteria);
  const criteria = useMemo<Record<string,string>>(() => JSON.parse(criteriaKey), [criteriaKey]);
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(true);
  const [offers, setOffers] = useState<SandboxOffer[]>([]);
  const [choices, setChoices] = useState<SandboxPlace[]>([]);
  const [message, setMessage] = useState("Searching KAYAK alongside the other providers…");
  const [limit, setLimit] = useState(10);
  const run = useCallback(async (destinationId?: string) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setOffers([]); setChoices([]); setLimit(10);
    setMessage("Searching KAYAK alongside the other providers…");
    try {
      const response = await fetch("/api/sandbox/kayak", { method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ action: "regular-search", vertical, criteria: { ...criteria, ...(destinationId ? { destinationId } : {}) } }) });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setChoices(Array.isArray(data.choices) ? data.choices : []);
        setMessage(data.error || "KAYAK is unavailable. Other provider results are unaffected.");
        return;
      }
      setOffers(data.results);
      setMessage(data.results.length ? `${data.results.length} KAYAK simulated offers found.` : "No KAYAK test offers for this search. Other provider results are unaffected.");
    } catch {
      if (!controller.signal.aborted) setMessage("KAYAK is unavailable. Other provider results are unaffected. You can retry KAYAK below.");
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }, [criteria, vertical]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void run(); });
    return () => { active = false; request.current?.abort(); request.current = null; };
  }, [run]);
  return <KayakResultsContext.Provider value={{vertical,offers,criteria}}><section aria-label="KAYAK sandbox provider results" className="page-shell my-4 rounded-xl border border-amber-500 bg-amber-50 p-4">
    <h2 className="text-xl font-bold">KAYAK · sandbox provider</h2>
    <p>Simulated inventory. Cards use your display currency; converted amounts are estimates of the original provider price. No real bookings or payments. {children ? "KAYAK offers use the shared results, filters and sorting below." : "Other providers remain available separately below."}</p>
    <p role="status" aria-live="polite" className="my-3">{message}</p>
    {choices.length > 0 && <ul aria-label="Matching KAYAK destinations">{choices.map(place => <li key={place.value}>
      <button type="button" disabled={busy} className="my-1 rounded border bg-white p-2" onClick={() => void run(place.value)}>{place.label}</button>
    </li>)}</ul>}
    {!children && <ul className="grid gap-4">{offers.slice(0, limit).map(offer => <li key={offer.id} className="min-w-0">
      <KayakResultCard offer={offer} vertical={vertical} criteria={criteria} />
    </li>)}</ul>}
    {!children && limit < offers.length && <button type="button" className="m-2 rounded border bg-white p-2" onClick={() => setLimit(value => value + 10)}>Show more KAYAK test offers</button>}
    <button type="button" className="my-3 rounded border bg-white p-2 disabled:opacity-50" disabled={busy} onClick={() => void run()}>{busy ? "Searching KAYAK…" : "Retry KAYAK provider"}</button>
  </section>{children}</KayakResultsContext.Provider>;
}
