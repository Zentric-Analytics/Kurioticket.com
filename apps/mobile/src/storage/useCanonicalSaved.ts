import { useCallback, useEffect, useState } from "react";
import { useAccountRefresh } from "./useAccountRefresh";
import { readSession } from "./sessionStorage";
import { savedRepositoryFor, type SavedSnapshot } from "./savedRepository";
import { favoriteAction } from "./favoriteAccess";
import { showFavoriteSignInPrompt } from "./favoriteSignInPrompt";
import { carSavedSignature, mapHotelToSaved } from "./savedMapping";
import { recordNativeSavedInteraction } from "../features/privacy/nativeSavedTracking";

const emptySnapshot = (): SavedSnapshot => ({ destinationIds: new Set(), flights: new Map(), cars: new Map(), pendingFlightKeys: new Set(), items: [], loading: true, error: "" });

export function useCanonicalSaved() {
  const [userId, setUserId] = useState<string | null>(null);
  const [owned, setOwned] = useState<{ userId: string | null; value: SavedSnapshot }>({ userId: null, value: emptySnapshot() });
  const auth = useCallback(() => { void readSession().then((session) => { const id = session?.user.id ?? null; setUserId(id); if (id) void savedRepositoryFor(id).refresh(); }).catch(() => setUserId(null)); }, []);
  useAccountRefresh(auth, () => { setUserId(null); setOwned({ userId: null, value: emptySnapshot() }); });
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
    toggleHotel: async (hotel: import("../api/travelApi").HotelResult, params: Record<string, unknown>, journeyRequestId?: string | null) => {
      if (favoriteAction(userId) === "sign-in" || !userId) {
        showFavoriteSignInPrompt("/saved");
        return;
      }
      if (!mapHotelToSaved(hotel, params)) return;
      const repository = savedRepositoryFor(userId);
      const wasSaved = repository.snapshot().items.some(item => item.type === "hotel" &&
        ((item.payload as Record<string, unknown> | undefined)?.result as { id?: string } | undefined)?.id === hotel.id);
      await repository.toggleHotel(hotel, params);
      void recordNativeSavedInteraction({ action: wasSaved ? "saved_item_removed" : "saved_item_confirmed",
        product: "HOTEL", resultId: hotel.id, requestId: journeyRequestId });
    },
    toggleCar: async (car: import("../api/travelApi").CarResult, params: Record<string, unknown>, journeyRequestId?: string | null) => {
      if (favoriteAction(userId) === "sign-in" || !userId) {
        showFavoriteSignInPrompt("/saved");
        return;
      }
      const signature = carSavedSignature(car, params);
      if (!signature) return;
      const repository = savedRepositoryFor(userId);
      const wasSaved = repository.snapshot().cars.has(signature);
      await repository.toggleCar(car, params);
      void recordNativeSavedInteraction({ action: wasSaved ? "saved_item_removed" : "saved_item_confirmed",
        product: "CAR", resultId: car.id, requestId: journeyRequestId });
    },
    remove: async (type: "flight" | "hotel" | "car" | "search", id: string) => { if (userId) await savedRepositoryFor(userId).remove(type, id); },
    refresh: async () => { if (userId) await savedRepositoryFor(userId).refresh(); },
  };
}
