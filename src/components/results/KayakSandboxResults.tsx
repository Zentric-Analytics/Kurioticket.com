"use client";

import { useEffect, useRef, useState } from "react";
import type { KayakSearch, SandboxOffer } from "@/services/travel/kayakSandbox";

/** Test inventory deliberately has no booking/cart integration. */
export function KayakSandboxResults({ search }: { search: KayakSearch }) {
  const inFlight = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => { requestRef.current?.abort(); }, []);
  const [busy, setBusy] = useState(false);
  const [offers, setOffers] = useState<SandboxOffer[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [message, setMessage] = useState("Ready to search KAYAK's simulated inventory.");
  async function run() {
    if (inFlight.current) return;
    inFlight.current = true;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setOffers([]);
    setVisibleCount(20);
    setMessage("Loading KAYAK test results…");
    try {
      const response = await fetch("/api/sandbox/kayak", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(search), cache: "no-store", signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(data.error || "Test search unavailable.");
      setOffers(data.results);
      setMessage(data.results.length ? `${data.results.length} simulated offers found.` : "No test results found.");
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(error instanceof Error ? error.message : "Test search failed. Please retry.");
    } finally {
      if (!controller.signal.aborted) {
        inFlight.current = false;
        requestRef.current = null;
        setBusy(false);
      }
    }
  }
  return <main className="page-shell py-6">
    <h1 className="text-2xl font-bold">KAYAK sandbox {search.vertical} results</h1>
    <p className="my-3 rounded border border-amber-600 bg-amber-50 p-3">Simulated prices and availability. No real bookings or payments. Live inventory is not displayed in this test view.</p>
    <p>{search.vertical === "flights" ? `${search.origin} → ${search.destination}` : search.vertical === "cars" ? `${search.origin} · same-airport rental · noon pickup and return` : `${search.destination} · one room`}</p>
    <p>{search.departure}{search.returnDate ? ` to ${search.returnDate}` : ""}{"adults" in search ? ` · ${search.adults} adults` : ""}</p>
    <button type="button" disabled={busy} onClick={run} className="my-4 rounded bg-blue-800 px-4 py-3 text-white disabled:opacity-50">{busy ? "Searching…" : "Search KAYAK test inventory"}</button>
    <p role="status" aria-live="polite">{message}</p>
    <ul className="mt-4 grid gap-4 sm:grid-cols-2">{offers.slice(0, visibleCount).map((offer) => <li key={offer.id} className="rounded border p-4">
      <p className="font-bold text-amber-800">SIMULATED · NOT BOOKABLE</p>
      <h2 className="text-lg font-semibold">{offer.title}</h2>
      <p>{offer.description}</p>
      <ul>{offer.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>
      <p>{new Intl.NumberFormat("en-US", { style: "currency", currency: offer.currency }).format(offer.price)} {offer.priceBasis}</p>
      <a className="underline" href={offer.testUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open KAYAK test page</a>
    </li>)}</ul>
    {visibleCount < offers.length && <button type="button" className="my-4 rounded border px-4 py-3" onClick={() => setVisibleCount((count) => count + 20)}>Show more simulated offers</button>}
  </main>;
}
