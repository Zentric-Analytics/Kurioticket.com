import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { TravelApiError, type FlightResult } from "../api/travelApi";
import { favoriteAction } from "./favoriteAccess";
import { showFavoriteSignInPrompt } from "./favoriteSignInPrompt";
import { clearSession, readSession } from "./sessionStorage";
import { flightSavedSignature } from "./savedMapping";
import { savedRepositoryFor, type SavedSnapshot } from "./savedRepository";

export function useSavedFlights() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [savedFlights, setSavedFlights] = useState(new Map<string, FlightResult>());
  const [pendingFlightKeys, setPendingFlightKeys] = useState(new Set<string>());
  const refresh = useCallback(() => {
    void readSession().then((session) => setUserId(session?.user.id ?? null)).catch(() => setUserId(null));
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    if (!userId) {
      setSavedFlights(new Map());
      setPendingFlightKeys(new Set());
      return;
    }
    const repository = savedRepositoryFor(userId);
    const update = (value: SavedSnapshot) => {
      setSavedFlights(value.flights);
      setPendingFlightKeys(value.pendingFlightKeys);
    };
    update(repository.snapshot());
    const unsubscribe = repository.subscribe(update);
    void repository.refresh();
    return unsubscribe;
  }, [userId]);
  const toggle = useCallback(async (flight: FlightResult, searchParams?: Record<string, unknown>) => {
    let resolvedUserId = userId;
    if (resolvedUserId === undefined) {
      const session = await readSession();
      resolvedUserId = session?.user.id ?? null;
      setUserId(resolvedUserId);
    }
    if (favoriteAction(resolvedUserId) === "sign-in" || !resolvedUserId) {
      showFavoriteSignInPrompt("/saved");
      return;
    }
    const repository = savedRepositoryFor(resolvedUserId);
    const operation = repository.snapshot().flights.has(flightSavedSignature(flight)) ? "remove" : "save";
    try {
      await savedRepositoryFor(resolvedUserId).toggleFlight(flight, searchParams);
    } catch (error) {
      if (error instanceof TravelApiError && error.status === 401) {
        await clearSession();
        setUserId(null);
        showFavoriteSignInPrompt("/saved");
        return;
      }
      if (__DEV__ && error instanceof TravelApiError && error.status === 400) {
        const serverError = error.details?.error;
        console.warn("Saved flight mutation rejected", {
          operation,
          status: error.status,
          code: error.code,
          serverCode: typeof serverError === "object" && serverError !== null ? (serverError as Record<string, unknown>).code : undefined,
          serverMessage: error.message,
        });
      }
      throw error;
    }
  }, [userId]);
  return { savedFlights, pendingFlightKeys, toggle, refresh };
}
