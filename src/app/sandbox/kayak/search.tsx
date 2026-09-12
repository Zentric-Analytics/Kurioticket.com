"use client";

import { useState, useRef } from "react";
import type {
  KayakVertical,
  SandboxOffer,
  SandboxPlace,
} from "@/services/travel/kayakSandbox";

export function KayakSandboxSearch() {
  const [vertical, setVertical] = useState<KayakVertical>("flights");
  const [places, setPlaces] = useState<SandboxPlace[]>([]);
  const [offers, setOffers] = useState<SandboxOffer[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const [origin, setOrigin] = useState("BOS");
  const [destination, setDestination] = useState("JFK");
  async function request(body: unknown) {
    const response = await fetch("/api/sandbox/kayak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Search unavailable.");
    return data;
  }
  async function lookup(form: FormData) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setMessage("");
    setPlaces([]);
    try {
      const data = await request({
        action: "places",
        vertical,
        term: form.get("term"),
      });
      setPlaces(data.results);
      setMessage(
        data.results.length
          ? "Choose a location below."
          : "No matching locations.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Location lookup failed.",
      );
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  async function search(form: FormData) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setOffers([]);
    setMessage("Waiting for KAYAK to finish the test search…");
    try {
      const data = await request({
        vertical,
        origin,
        destination,
        departure: form.get("departure"),
        ...(form.get("returnDate")
          ? { returnDate: form.get("returnDate") }
          : {}),
        adults: Number(form.get("adults") || 1),
        empty: form.get("empty") === "on",
      });
      setOffers(data.results);
      setMessage(
        data.results.length
          ? `${data.results.length} test offers returned. No real booking is available.`
          : "No test results found. Try different search details.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search failed.");
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  const input =
    "mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-950";
  const button =
    "rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50";
  return (
    <section aria-busy={busy}>
      <label className="block max-w-xs font-semibold">
        Search type
        <select
          className={input}
          disabled={busy}
          value={vertical}
          onChange={(event) => {
            const value = event.target.value as KayakVertical;
            setVertical(value);
            setDestination(value === "hotels" ? "" : "JFK");
            setOffers([]);
            setPlaces([]);
            setMessage("");
          }}
        >
          <option value="flights">Flights</option>
          <option value="hotels">Hotels</option>
          <option value="cars">Cars</option>
        </select>
      </label>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void lookup(new FormData(event.currentTarget));
        }}
        className="my-6 flex flex-wrap items-end gap-3"
      >
        <label className="grow">
          {vertical === "hotels" ? "Find a destination" : "Find an airport"}
          <input
            className={input}
            name="term"
            minLength={2}
            maxLength={80}
            required
            defaultValue="Boston"
            disabled={busy}
          />
        </label>
        <button className={button} disabled={busy}>
          Find locations
        </button>
      </form>
      <ul className="mb-6 space-y-2">
        {places.map((place) => (
          <li key={place.value}>
            <button
              className="rounded border px-3 py-2 text-left"
              disabled={busy}
              onClick={() => {
                if (vertical === "hotels") setDestination(place.value);
                else setOrigin(place.value);
              }}
            >
              {place.label} — use as{" "}
              {vertical === "hotels" ? "destination" : "origin"}
            </button>
            {vertical === "flights" && (
              <button
                className="ml-2 rounded border px-3 py-2"
                disabled={busy}
                onClick={() => setDestination(place.value)}
              >
                Use as destination
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void search(new FormData(event.currentTarget));
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {vertical !== "hotels" && (
          <label>
            Origin airport
            <input
              className={input}
              aria-label="Origin airport"
              value={origin}
              onChange={(event) => setOrigin(event.target.value.toUpperCase())}
              required
              pattern="[A-Z]{3}"
              disabled={busy}
            />
          </label>
        )}
        {vertical !== "cars" && (
          <label>
            {vertical === "hotels"
              ? "Selected destination"
              : "Destination airport"}
            <input
              className={input}
              aria-label="Destination"
              value={destination}
              onChange={(event) =>
                setDestination(event.target.value.toUpperCase())
              }
              readOnly={vertical === "hotels"}
              required
              disabled={busy}
              placeholder={
                vertical === "hotels"
                  ? "Find and choose a destination above"
                  : "JFK"
              }
            />
          </label>
        )}
        <label>
          Start date
          <input
            className={input}
            type="date"
            name="departure"
            required
            disabled={busy}
          />
        </label>
        <label>
          End date {vertical === "flights" ? "(optional return)" : ""}
          <input
            className={input}
            type="date"
            name="returnDate"
            required={vertical !== "flights"}
            disabled={busy}
          />
        </label>
        {vertical !== "cars" && (
          <label>
            Adults {vertical === "hotels" ? "(one room)" : ""}
            <input
              className={input}
              type="number"
              name="adults"
              min={1}
              max={6}
              defaultValue={1}
              required
              disabled={busy}
            />
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="empty" disabled={busy} />
          Test the no-results response
        </label>
        <button className={button} disabled={busy}>
          {busy ? "Please wait…" : "Search KAYAK sandbox"}
        </button>
      </form>
      <p role="status" aria-live="polite" className="my-6">
        {message}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {offers.map((offer) => (
          <li key={offer.id} className="rounded-xl border p-5">
            <p className="text-xs font-bold text-amber-800">
              SIMULATED · NOT BOOKABLE
            </p>
            <h2 className="mt-2 text-lg font-semibold">{offer.title}</h2>
            <p>{offer.description}</p>
            <ul className="my-2 space-y-1 text-sm">
              {offer.details?.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
            <p className="my-3 text-xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: offer.currency,
              }).format(offer.price)}{" "}
              <span className="text-sm font-normal">{offer.priceBasis}</span>
            </p>
            <a
              className="underline"
              href={offer.testUrl}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              Open KAYAK test page
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
