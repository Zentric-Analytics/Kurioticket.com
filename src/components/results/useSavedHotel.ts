"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  isHotelIdSaved,
  parseSavedHotelIds,
  parseSavedHotelSnapshots,
  removeSavedHotelSnapshot,
  SAVED_HOTEL_IDS_CHANGED_EVENT,
  SAVED_HOTEL_IDS_STORAGE_KEY,
  SAVED_HOTEL_SNAPSHOTS_STORAGE_KEY,
  serializeSavedHotelIds,
  serializeSavedHotelSnapshots,
  upsertSavedHotelSnapshot,
  type SavedHotelSnapshot,
} from "@/components/results/hotelSavedStorage";
import {
  deleteBackendHotel,
  fetchBackendSavedHotels,
  saveBackendHotel,
  type SavedHotelApiItem,
} from "@/lib/saved-trips-api";

type UseSavedHotelOptions = {
  hotelId: string;
  getSnapshot: () => SavedHotelSnapshot;
};

function getSavedHotelResultId(item: SavedHotelApiItem): string | null {
  if (
    item.payload &&
    typeof item.payload === "object" &&
    "hotelResultId" in item.payload &&
    typeof item.payload.hotelResultId === "string"
  ) {
    return item.payload.hotelResultId;
  }

  return null;
}

export function useSavedHotel({ hotelId, getSnapshot }: UseSavedHotelOptions) {
  const { status: sessionStatus } = useSession();
  const [isSaved, setIsSaved] = useState(false);

  function writeLocalHotelSave(nextSaved: boolean) {
    const savedIds = parseSavedHotelIds(
      window.localStorage.getItem(SAVED_HOTEL_IDS_STORAGE_KEY),
    );

    const nextSavedIds = nextSaved
      ? Array.from(new Set([...savedIds, hotelId]))
      : savedIds.filter((id) => id !== hotelId);

    const serializedValue = serializeSavedHotelIds(nextSavedIds);

    const snapshots = parseSavedHotelSnapshots(
      window.localStorage.getItem(SAVED_HOTEL_SNAPSHOTS_STORAGE_KEY),
    );

    const nextSnapshots = nextSaved
      ? upsertSavedHotelSnapshot(snapshots, getSnapshot())
      : removeSavedHotelSnapshot(snapshots, hotelId);

    window.localStorage.setItem(SAVED_HOTEL_IDS_STORAGE_KEY, serializedValue);

    window.localStorage.setItem(
      SAVED_HOTEL_SNAPSHOTS_STORAGE_KEY,
      serializeSavedHotelSnapshots(nextSnapshots),
    );

    setIsSaved(nextSaved);

    window.dispatchEvent(
      new CustomEvent(SAVED_HOTEL_IDS_CHANGED_EVENT, {
        detail: serializedValue,
      }),
    );
  }

  useEffect(() => {
    let isActive = true;

    function updateSavedState(rawValue: string | null) {
      if (!isActive) return;

      setIsSaved(isHotelIdSaved(parseSavedHotelIds(rawValue), hotelId));
    }

    queueMicrotask(() => {
      if (sessionStatus === "authenticated") {
        void fetchBackendSavedHotels()
          .then((result) => {
            if (!result.ok || !result.items) return;
            const savedHotelIds = result.items
              .map((item) => getSavedHotelResultId(item))
              .filter((id): id is string => Boolean(id));
            updateSavedState(serializeSavedHotelIds(savedHotelIds));
          })
          .catch(() => undefined);
        return;
      }

      try {
        updateSavedState(
          window.localStorage.getItem(SAVED_HOTEL_IDS_STORAGE_KEY),
        );
      } catch {
        updateSavedState(null);
      }
    });

    function handleStorage(event: StorageEvent) {
      if (event.key !== SAVED_HOTEL_IDS_STORAGE_KEY) return;

      updateSavedState(event.newValue);
    }

    function handleSavedHotelIdsChanged(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      if (typeof event.detail !== "string") return;

      updateSavedState(event.detail);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      SAVED_HOTEL_IDS_CHANGED_EVENT,
      handleSavedHotelIdsChanged,
    );

    return () => {
      isActive = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        SAVED_HOTEL_IDS_CHANGED_EVENT,
        handleSavedHotelIdsChanged,
      );
    };
  }, [hotelId, sessionStatus]);

  async function toggleSavedHotel() {
    if (sessionStatus === "authenticated") {
      const result = await fetchBackendSavedHotels();
      const savedHotel = result.items?.find(
        (item) => getSavedHotelResultId(item) === hotelId,
      );

      if (savedHotel) {
        const deleteResult = await deleteBackendHotel(savedHotel.id);
        if (deleteResult.ok) setIsSaved(false);
        return;
      }

      const snapshot = getSnapshot();
      const saveResult = await saveBackendHotel({
        provider: snapshot.provider,
        hotelName: snapshot.hotelName,
        destination: snapshot.destination,
        checkIn: snapshot.checkIn,
        checkOut: snapshot.checkOut,
        totalPrice: snapshot.totalPrice,
        currency: snapshot.currency,
        payload: { ...snapshot, hotelResultId: hotelId },
      });
      if (saveResult.ok || saveResult.duplicate) setIsSaved(true);
      return;
    }

    try {
      writeLocalHotelSave(!isSaved);
    } catch {
      // Keep the previous visual state if browser storage is unavailable.
    }
  }

  return {
    isSaved,
    toggleSavedHotel,
  };
}
