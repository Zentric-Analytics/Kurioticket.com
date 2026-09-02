"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { deleteBackendCar, fetchBackendSavedCars, saveBackendCar, type SavedCarApiItem } from "@/lib/saved-items-api";

const resultId = (item: SavedCarApiItem) => {
  if (typeof item.resultId === "string") return item.resultId;
  if (item.payload && typeof item.payload === "object" && "result" in item.payload) {
    const result = item.payload.result;
    if (result && typeof result === "object" && "id" in result && typeof result.id === "string") return result.id;
  }
  return null;
};

export function useSavedCar(car: NormalizedCarResult, search: CarSearchParams) {
  const { status } = useSession();
  const [savedItem, setSavedItem] = useState<SavedCarApiItem | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") { queueMicrotask(() => setSavedItem(null)); return; }
    const controller = new AbortController();
    void fetchBackendSavedCars(controller.signal).then((response) => {
      if (response.ok) setSavedItem(response.items?.find((item) => resultId(item) === car.id) ?? null);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [car.id, status]);

  async function toggleSavedCar() {
    if (pending) return;
    if (status !== "authenticated") { await signIn(undefined, { callbackUrl: window.location.href }); return; }
    const previous = savedItem;
    setPending(true);
    if (previous) setSavedItem(null);
    try {
      if (previous) {
        const response = await deleteBackendCar(previous.id);
        if (!response.ok) setSavedItem(previous);
        return;
      }
      const offer = car.offers[0];
      if (!offer) return;
      const response = await saveBackendCar({
        resultId: car.id,
        provider: offer.bookingProviderName || offer.rentalCompanyName || car.rentalCompanyName,
        modelName: car.modelName,
        categoryLabel: car.categoryLabel,
        pickupLocation: search.pickupLocation,
        dropoffLocation: search.dropoffLocation,
        pickupDate: search.pickupDate,
        pickupTime: search.pickupTime,
        dropoffDate: search.dropoffDate,
        dropoffTime: search.dropoffTime,
        driverAge: Number(search.driverAge),
        totalPrice: offer.totalPrice,
        currency: offer.currency,
        payload: { result: car, searchParams: search },
      });
      if (response.ok && response.item) setSavedItem({ ...response.item, type: "car", resultId: car.id });
      else if (response.duplicate) {
        const refreshed = await fetchBackendSavedCars();
        setSavedItem(refreshed.items?.find((item) => resultId(item) === car.id) ?? null);
      }
    } finally { setPending(false); }
  }

  return { isSaved: Boolean(savedItem), pending, toggleSavedCar };
}
