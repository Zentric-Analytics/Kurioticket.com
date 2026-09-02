import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { readSession } from "./sessionStorage";
import { savedRepositoryFor, type SavedSnapshot } from "./savedRepository";
import { favoriteAction } from "./favoriteAccess";
import { showFavoriteSignInPrompt } from "./favoriteSignInPrompt";

const emptySnapshot = (): SavedSnapshot => ({ destinationIds: new Set(), flights: new Map(), cars: new Map(), pendingFlightKeys: new Set(), items: [], loading: true, error: "" });

export function useCanonicalSaved() {
  const [userId, setUserId] = useState<string | null>(null);
  const [owned, setOwned] = useState<{ userId: string | null; value: SavedSnapshot }>({ userId: null, value: emptySnapshot() });
  const auth = useCallback(() => { void readSession().then((session) => setUserId(session?.user.id ?? null)).catch(() => setUserId(null)); }, []);
  useFocusEffect(auth);
  useEffect(() => {
    if (!userId) { setOwned({ userId: null, value: emptySnapshot() }); return; }
    const repo = savedRepositoryFor(userId);
    setOwned({ userId, value: repo.snapshot() });
    const unsubscribe = repo.subscribe((value) => setOwned({ userId, value }));
    void repo.refresh();
    return unsubscribe;
  }, [userId]);
  const value = owned.userId === userId ? owned.value : emptySnapshot();
  return {
    ...value,
    toggleHotel: async (hotel: import("../api/travelApi").HotelResult, params: Record<string, unknown>) => {
      if (favoriteAction(userId) === "sign-in" || !userId) {
        showFavoriteSignInPrompt("/saved");
        return;
      }
      await savedRepositoryFor(userId).toggleHotel(hotel, params);
    },
    toggleCar: async (car: import("../api/travelApi").CarResult, params: Record<string, unknown>) => {
      if (favoriteAction(userId) === "sign-in" || !userId) {
        showFavoriteSignInPrompt("/saved");
        return;
      }
      await savedRepositoryFor(userId).toggleCar(car, params);
    },
    remove: async (type: "flight" | "hotel" | "car" | "search", id: string) => { if (userId) await savedRepositoryFor(userId).remove(type, id); },
  };
}
