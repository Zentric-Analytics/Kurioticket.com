"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { PublicFlightResult } from "@/lib/types";
import { readSavedItemIds, toggleSavedItemId, writeSavedItemIds } from "@/lib/saved-items-local";

type SavedFlightItem = {
  id: string;
  payload?: Record<string, unknown>;
};

const SAVED_FLIGHTS_CHANGED_EVENT = "kurioticket:saved-flights-changed";
const LOCAL_SAVED_FLIGHTS_CHANGED_EVENT = "kurioticket:local-saved-flights-changed";

let savedFlightsOwner = "";
let savedFlightsCache: SavedFlightItem[] | null = null;
let savedFlightsRequest: Promise<SavedFlightItem[]> | null = null;
let savedFlightsRevision = 0;

function clearSavedFlightsCache(owner = "") {
  savedFlightsRevision += 1;
  savedFlightsOwner = owner;
  savedFlightsCache = null;
  savedFlightsRequest = null;
}

function loadSavedFlights(owner: string) {
  if (savedFlightsOwner !== owner) clearSavedFlightsCache(owner);
  if (savedFlightsCache) return Promise.resolve(savedFlightsCache);
  if (savedFlightsRequest) return savedFlightsRequest;
  const revision = savedFlightsRevision;
  const request = fetch("/api/dashboard/saved?type=flight", {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) return [];
      const data = await response.json() as { items?: SavedFlightItem[] };
      const items = Array.isArray(data.items) ? data.items : [];
      if (savedFlightsRevision === revision) savedFlightsCache = items;
      return items;
    })
    .finally(() => {
      if (savedFlightsRequest === request) savedFlightsRequest = null;
    });
  savedFlightsRequest = request;
  return request;
}

function publishSavedFlights(items: SavedFlightItem[]) {
  savedFlightsRevision += 1;
  savedFlightsCache = items;
  window.dispatchEvent(new Event(SAVED_FLIGHTS_CHANGED_EVENT));
}

function matchingSavedFlight(items: SavedFlightItem[] | null, flightId: string) {
  return items?.find((item) => item.payload?.flightResultId === flightId) ?? null;
}

export function useSavedFlightResult(
  flight: PublicFlightResult,
  detailsHref: string | null,
) {
  const { data: session, status } = useSession();
  const owner = session?.user?.email ?? "authenticated-user";
  const [savedItem, setSavedItem] = useState<SavedFlightItem | null>(null);
  const [localSaved, setLocalSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      clearSavedFlightsCache();
      const syncLocal = () => setLocalSaved(readSavedItemIds().includes(flight.id));
      syncLocal();
      window.addEventListener(LOCAL_SAVED_FLIGHTS_CHANGED_EVENT, syncLocal);
      return () => window.removeEventListener(LOCAL_SAVED_FLIGHTS_CHANGED_EVENT, syncLocal);
    }

    const update = () => setSavedItem(matchingSavedFlight(savedFlightsCache, flight.id));
    void loadSavedFlights(owner).then(() => update()).catch(() => undefined);
    window.addEventListener(SAVED_FLIGHTS_CHANGED_EVENT, update);
    return () => window.removeEventListener(SAVED_FLIGHTS_CHANGED_EVENT, update);
  }, [flight.id, owner, status]);

  async function toggleSavedFlight() {
    if (pending) return;
    setPending(true);
    try {
      if (status === "authenticated") {
        const previous = savedItem;
        if (previous) {
          setSavedItem(null);
          const response = await fetch("/api/dashboard/saved", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ type: "flight", id: previous.id }),
          });
          if (response.ok) {
            publishSavedFlights((savedFlightsCache ?? []).filter((item) => item.id !== previous.id));
          } else {
            setSavedItem(previous);
          }
          return;
        }

        const response = await fetch("/api/dashboard/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            type: "flight",
            provider: flight.provider,
            airlineName: flight.airlineName,
            flightNumber: flight.flightNumber ?? null,
            originAirport: flight.originAirport,
            destinationAirport: flight.destinationAirport,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            price: flight.price,
            currency: flight.currency,
            payload: {
              flightResultId: flight.id,
              detailsHref,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json() as { item?: SavedFlightItem };
          if (data.item) publishSavedFlights([...(savedFlightsCache ?? []), data.item]);
        } else if (response.status === 409) {
          clearSavedFlightsCache(owner);
          const refreshed = await loadSavedFlights(owner);
          publishSavedFlights(refreshed);
        }
        return;
      }

      const next = toggleSavedItemId(readSavedItemIds(), flight.id);
      writeSavedItemIds(next);
      setLocalSaved(next.includes(flight.id));
      window.dispatchEvent(new Event(LOCAL_SAVED_FLIGHTS_CHANGED_EVENT));
    } finally {
      setPending(false);
    }
  }

  return {
    isSaved: status === "authenticated" ? Boolean(savedItem) : localSaved,
    pending,
    toggleSavedFlight,
  };
}
