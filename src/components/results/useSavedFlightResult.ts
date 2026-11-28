"use client";

import { savedFlightTimeFields, SavedFlightTimeError } from "@/shared/flights/savedFlightTime";
import { beginCustomerInteraction, recordCustomerInteraction } from "@/lib/customerInteractionClient";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import type { PublicFlightResult } from "@/lib/types";
import { getSavedFlightsInvalidationRevision, SAVED_FLIGHTS_INVALIDATED_EVENT } from "@/lib/saved-flight-events";

type SavedFlightItem = {
  id: string;
  payload?: Record<string, unknown>;
};

const SAVED_FLIGHTS_CHANGED_EVENT = "kurioticket:saved-flights-changed";

let savedFlightsOwner = "";
let savedFlightsCache: SavedFlightItem[] | null = null;
let savedFlightsRequest: Promise<SavedFlightItem[]> | null = null;
let savedFlightsRevision = 0;
let savedFlightsLoadedInvalidationRevision = -1;

function clearSavedFlightsCache(owner = "") {
  savedFlightsRevision += 1;
  savedFlightsOwner = owner;
  savedFlightsCache = null;
  savedFlightsRequest = null;
  savedFlightsLoadedInvalidationRevision = -1;
}

function loadSavedFlights(owner: string) {
  if (savedFlightsOwner !== owner) clearSavedFlightsCache(owner);
  const invalidationRevision = getSavedFlightsInvalidationRevision();
  if (
    savedFlightsCache &&
    savedFlightsLoadedInvalidationRevision === invalidationRevision
  ) {
    return Promise.resolve(savedFlightsCache);
  }
  if (
    savedFlightsCache &&
    savedFlightsLoadedInvalidationRevision !== invalidationRevision
  ) {
    clearSavedFlightsCache(owner);
  }
  if (savedFlightsRequest) return savedFlightsRequest;
  const revision = savedFlightsRevision;
  const request = fetch("/api/dashboard/saved?type=flight", {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) return [];
      const data = await response.json() as { items?: SavedFlightItem[] };
      const items = Array.isArray(data.items) ? data.items : [];
      if (savedFlightsRevision === revision) {
        savedFlightsCache = items;
        savedFlightsLoadedInvalidationRevision = invalidationRevision;
      }
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
  savedFlightsLoadedInvalidationRevision = getSavedFlightsInvalidationRevision();
  window.dispatchEvent(new Event(SAVED_FLIGHTS_CHANGED_EVENT));
}

function matchingSavedFlight(items: SavedFlightItem[] | null, flightId: string) {
  return items?.find((item) => item.payload?.flightResultId === flightId) ?? null;
}

export function useSavedFlightResult(
  flight: PublicFlightResult,
  detailsHref: string | null,
  searchRequestId?: string | null,
) {
  const { data: session, status } = useSession();
  const owner = session?.user?.email ?? "authenticated-user";
  const [savedItem, setSavedItem] = useState<SavedFlightItem | null>(null);
  const [pending, setPending] = useState(false);
  const [savedFlightError, setSavedFlightError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      clearSavedFlightsCache();
      let active = true;
      queueMicrotask(() => { if (active) setSavedItem(null); });
      return () => { active = false; };
    }

    const update = () => setSavedItem(matchingSavedFlight(savedFlightsCache, flight.id));
    const invalidate = () => {
      clearSavedFlightsCache(owner);
      void loadSavedFlights(owner).then(() => update()).catch(() => undefined);
    };
    void loadSavedFlights(owner).then(() => update()).catch(() => undefined);
    window.addEventListener(SAVED_FLIGHTS_CHANGED_EVENT, update);
    window.addEventListener(SAVED_FLIGHTS_INVALIDATED_EVENT, invalidate);
    return () => {
      window.removeEventListener(SAVED_FLIGHTS_CHANGED_EVENT, update);
      window.removeEventListener(SAVED_FLIGHTS_INVALIDATED_EVENT, invalidate);
    };
  }, [flight.id, owner, status]);

  const observedResult = Number.isFinite(flight.price) && flight.price > 0 && /^[A-Z]{3}$/.test(flight.currency)
    ? { label: flight.airlineName, provider: flight.provider, amount: flight.price,
        currency: flight.currency, priceBasis: "total" as const }
    : undefined;

  async function toggleSavedFlight() {
    const analyticsConsent = beginCustomerInteraction();
    if (pending || status === "loading") return;
    setPending(true);
    setSavedFlightError(null);
    try {
      if (status === "unauthenticated") {
        await signIn(undefined, { callbackUrl: window.location.href });
        return;
      }
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
            recordCustomerInteraction(analyticsConsent, { action: "saved_item_removed", product: "FLIGHT", resultId: flight.id, requestId: searchRequestId, observedResult });
          } else {
            setSavedItem(previous);
          }
          return;
        }

        const times = savedFlightTimeFields(flight);
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
            departureTime: times.departureTime,
            arrivalTime: times.arrivalTime,
            price: flight.price,
            currency: flight.currency,
            payload: {
              flightResultId: flight.id,
              flightTime: times.flightTime,
              detailsHref,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json() as { item?: SavedFlightItem };
          if (data.item) {
            publishSavedFlights([...(savedFlightsCache ?? []), data.item]);
            recordCustomerInteraction(analyticsConsent, { action: "saved_item_confirmed", product: "FLIGHT", resultId: flight.id, requestId: searchRequestId, observedResult });
          }
        } else if (response.status === 409) {
          clearSavedFlightsCache(owner);
          const refreshed = await loadSavedFlights(owner);
          publishSavedFlights(refreshed);
        }
        return;
      }

    } catch (error) {
      setSavedFlightError(error instanceof SavedFlightTimeError ? error.message : "Unable to save flight. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return {
    isSaved: status === "authenticated" && Boolean(savedItem),
    pending: pending || status === "loading",
    toggleSavedFlight,
    savedFlightError,
  };
}
