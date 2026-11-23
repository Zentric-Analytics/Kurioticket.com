"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { CarsResultsClient } from "./CarsResultsClient";
import { useJourneyEvents } from "@/components/privacy/JourneyEventsProvider";
import { journeyRequestId } from "@/lib/journeyEventClient";
import { carSearchRecoveryHref } from "@/lib/cars/carSearchRecovery";
import { carResultsReturnKey, rememberCarResultsReturn, readCarResultsReturn } from "@/lib/cars/carResultsReturnSnapshot";
import { takeResultsReturn } from "@/lib/results/resultsReturnIntent";
import { takeResultsScroll } from "@/lib/results/resultsReturnScroll";

/** Keep the document small; inventory arrives through the canonical JSON API. */
export function CarInventoryLoader({ values, fallback }: {
  values: LocationBoundCarSearchParams & { returnToDifferentLocation: boolean };
  fallback: ReactNode;
}) {
  const [results, setResults] = useState<NormalizedCarResult[] | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const journeyEvents = useJourneyEvents();
  const [error, setError] = useState(false);
  const [invalidSearch, setInvalidSearch] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const returnIntentRef = useRef<{ key: string; returning: boolean } | null>(null);
  const [expiredReturn, setExpiredReturn] = useState(false);
  useEffect(() => {
    const key = carResultsReturnKey(values);
    // Consume the marker once, but keep it for StrictMode's effect replay.
    if (returnIntentRef.current?.key !== key) {
      returnIntentRef.current = { key, returning: takeResultsReturn("car", window.location.href) };
    }
    if (returnIntentRef.current.returning && attempt === 0) {
      const snapshot = readCarResultsReturn(key);
      const timer = window.setTimeout(() => {
        if (snapshot) {
          setRequestId(snapshot.requestId);
          setResults(snapshot.results);
          setExpiredReturn(false);
        } else {
          // Do not request new supplier inventory or log another search on Back.
          setExpiredReturn(true);
          setResults(null);
        }
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 60_000);
    fetch("/api/cars/search", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values), signal: controller.signal,
    }).then(async response => {
      if (response.status === 422) {
        if (active) setUnsupported(true);
        return;
      }
      if (response.status === 400) {
        if (active) setInvalidSearch(true);
        return;
      }
      if (!response.ok) throw new Error("Car inventory unavailable");
      const data = await response.json();
      if (!Array.isArray(data.results)) throw new Error("Invalid car inventory");
      if (active) {
        const id = journeyRequestId(data.requestId);
        rememberCarResultsReturn(key, data.results, id);
        setRequestId(id);
        setResults(data.results);
        setExpiredReturn(false);
      }
    }).catch(() => { if (active) setError(true); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [values, attempt]);
  useEffect(() => {
    if (!returnIntentRef.current?.returning || attempt > 0 || !results?.length || expiredReturn) return;
    const y = takeResultsScroll("car");
    if (y === null) return;
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
    return () => window.cancelAnimationFrame(frame);
  }, [results, expiredReturn, attempt]);
  // A results-view event is emitted only for a visible, successful inventory
  // response with its actual server request ID. Consent and ownership checks
  // remain with the shared sender and the server; failed/empty searches do not
  // invent view events.
  useEffect(() => {
    if (results?.length && requestId) journeyEvents.resultsViewed(requestId);
  }, [results, requestId, journeyEvents]);
  if (expiredReturn) return <main className="page-shell py-8" data-cars-return-expired>
    <p role="alert">Your previous car results have expired. Search again to check current prices.</p>
    <button type="button" className="focus-ring mt-4 rounded-lg border border-[#004BB8] px-4 py-2 font-semibold text-[#004BB8]"
      onClick={() => { setExpiredReturn(false); setResults(null); setAttempt(value => value + 1); }}>Search again</button>
  </main>;
  if (invalidSearch) return <CarsResultsClient values={values} initialResults={[]} inventoryStatus="invalid-search" />;
  if (unsupported) return <main className="page-shell py-8">
    <p role="alert">These rental locations could not be verified or are unsupported. Select the locations again, then search.</p>
    <a className="mt-4 inline-block rounded border px-4 py-2" href={carSearchRecoveryHref(values)}>Change search</a>
  </main>;
  if (error) return <main className="page-shell py-8">
    <p role="alert">We couldn’t complete your search. Please try again.</p>
    <button type="button" className="mt-4 rounded border px-4 py-2" onClick={() => {
      setError(false); setAttempt(value => value + 1);
    }}>Retry search</button>
  </main>;
  if (results === null) return fallback;
  return <CarsResultsClient values={values} initialResults={results} inventoryStatus="available" requestId={requestId} />;
}
