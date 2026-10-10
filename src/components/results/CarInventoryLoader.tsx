"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { CarsResultsClient } from "./CarsResultsClient";

/** Keep the document small; inventory arrives through the canonical JSON API. */
export function CarInventoryLoader({ values, fallback }: {
  values: LocationBoundCarSearchParams & { returnToDifferentLocation: boolean };
  fallback: ReactNode;
}) {
  const [results, setResults] = useState<NormalizedCarResult[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 60_000);
    fetch("/api/cars/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values), signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Car inventory unavailable");
      const data = await response.json();
      if (!Array.isArray(data.results)) throw new Error("Invalid car inventory");
      if (active) setResults(data.results);
    }).catch(() => { if (active) setError(true); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [values, attempt]);
  if (error) return <main className="page-shell py-8">
    <p role="alert">We couldn’t complete your search. Please try again.</p>
    <button type="button" className="mt-4 rounded border px-4 py-2" onClick={() => {
      setError(false); setAttempt(value => value + 1);
    }}>Retry search</button>
  </main>;
  if (results === null) return fallback;
  return <CarsResultsClient values={values} initialResults={results} inventoryStatus="available" />;
}
