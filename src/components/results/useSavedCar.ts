"use client";

import { useEffect, useState } from "react";
import {
  readSavedItemIds,
  toggleSavedItemId,
  writeSavedItemIds,
} from "@/lib/saved-items-local";

const SAVED_CAR_PREFIX = "car:";
const SAVED_CARS_CHANGED_EVENT = "kurioticket:saved-cars-changed";

export function useSavedCar(carId: string) {
  const savedId = `${SAVED_CAR_PREFIX}${carId}`;
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const update = () => setIsSaved(readSavedItemIds().includes(savedId));
    queueMicrotask(update);
    window.addEventListener("storage", update);
    window.addEventListener(SAVED_CARS_CHANGED_EVENT, update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(SAVED_CARS_CHANGED_EVENT, update);
    };
  }, [savedId]);

  function toggleSavedCar() {
    const nextIds = toggleSavedItemId(readSavedItemIds(), savedId);
    writeSavedItemIds(nextIds);
    setIsSaved(nextIds.includes(savedId));
    window.dispatchEvent(new Event(SAVED_CARS_CHANGED_EVENT));
  }

  return { isSaved, toggleSavedCar };
}
