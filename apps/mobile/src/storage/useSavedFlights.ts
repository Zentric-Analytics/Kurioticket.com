import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { FlightResult } from "../api/travelApi";
import { favoriteAction } from "./favoriteAccess";
import { showFavoriteSignInPrompt } from "./favoriteSignInPrompt";
import { readSession } from "./sessionStorage";
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
    await savedRepositoryFor(resolvedUserId).toggleFlight(flight, searchParams);
  }, [userId]);
  return { savedFlights, pendingFlightKeys, toggle, refresh };
}
