"use client";

import { useEffect, useState } from "react";
import { beginCustomerInteraction, recordCustomerInteraction } from "@/lib/customerInteractionClient";
import { signIn, useSession } from "next-auth/react";
import type { SavedHotelSnapshot } from "@/components/results/hotelSavedStorage";
import {
  deleteBackendHotel,
  fetchBackendSavedHotels,
  saveBackendHotel,
  type SavedHotelApiItem,
} from "@/lib/saved-items-api";

type UseSavedHotelOptions = {
  hotelId: string;
  getSnapshot: () => SavedHotelSnapshot;
  searchRequestId?: string | null;
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

export function useSavedHotel({ hotelId, getSnapshot, searchRequestId }: UseSavedHotelOptions) {
  const { status: sessionStatus } = useSession();
  const [isSaved, setIsSaved] = useState(false);

  const observedResult = () => {
    try {
      const snapshot = getSnapshot();
      return Number.isFinite(snapshot.totalPrice) && snapshot.totalPrice > 0
        && /^[A-Z]{3}$/.test(snapshot.currency)
        ? { label: snapshot.hotelName, provider: snapshot.provider,
            amount: snapshot.totalPrice, currency: snapshot.currency, priceBasis: "total" as const }
        : undefined;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    let active = true;
    if (sessionStatus !== "authenticated") {
      queueMicrotask(() => { if (active) setIsSaved(false); });
      return () => { active = false; };
    }
    void fetchBackendSavedHotels()
      .then((result) => {
        if (active && result.ok && result.items) {
          setIsSaved(result.items.some((item) => getSavedHotelResultId(item) === hotelId));
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [hotelId, sessionStatus]);

  async function toggleSavedHotel() {
    const analyticsConsent = beginCustomerInteraction();
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      await signIn(undefined, { callbackUrl: window.location.href });
      return;
    }
    if (sessionStatus === "authenticated") {
      const result = await fetchBackendSavedHotels();
      const savedHotel = result.items?.find(
        (item) => getSavedHotelResultId(item) === hotelId,
      );

      if (savedHotel) {
        const deleteResult = await deleteBackendHotel(savedHotel.id);
        if (deleteResult.ok) {
          setIsSaved(false);
          recordCustomerInteraction(analyticsConsent, { action: "saved_item_removed", product: "HOTEL", resultId: hotelId, requestId: searchRequestId, observedResult: observedResult() });
        }
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
      if (saveResult.ok && !saveResult.duplicate) recordCustomerInteraction(analyticsConsent, {
        action: "saved_item_confirmed", product: "HOTEL", resultId: hotelId, requestId: searchRequestId, observedResult: observedResult(),
      });
      return;
    }

  }

  return {
    isSaved: sessionStatus === "authenticated" && isSaved,
    toggleSavedHotel,
  };
}
