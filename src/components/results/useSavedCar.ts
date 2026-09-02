"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { deleteBackendCar, fetchBackendSavedCars, saveBackendCar, type SavedCarApiItem } from "@/lib/saved-items-api";
import { SAVED_CARS_INVALIDATED_EVENT } from "@/lib/saved-car-events";

const SAVED_CARS_CHANGED_EVENT = "kurioticket:saved-cars-changed";
let savedCarsOwner = "";
let savedCarsCache: SavedCarApiItem[] | null = null;
let savedCarsRequest: Promise<SavedCarApiItem[]> | null = null;

function clearSavedCarsCache(owner = "") {
  savedCarsOwner = owner;
  savedCarsCache = null;
  savedCarsRequest = null;
}

function loadSavedCars(owner: string) {
  if (savedCarsOwner !== owner) clearSavedCarsCache(owner);
  if (savedCarsCache) return Promise.resolve(savedCarsCache);
  if (savedCarsRequest) return savedCarsRequest;
  savedCarsRequest = fetchBackendSavedCars()
    .then((response) => {
      if (response.ok) savedCarsCache = response.items ?? [];
      return savedCarsCache ?? [];
    })
    .finally(() => { savedCarsRequest = null; });
  return savedCarsRequest;
}

function publishSavedCars(items: SavedCarApiItem[]) {
  savedCarsCache = items;
  window.dispatchEvent(new Event(SAVED_CARS_CHANGED_EVENT));
}

const resultId = (item: SavedCarApiItem) => {
  if (typeof item.resultId === "string") return item.resultId;
  if (item.payload && typeof item.payload === "object" && "result" in item.payload) {
    const result = item.payload.result;
    if (result && typeof result === "object" && "id" in result && typeof result.id === "string") return result.id;
  }
  return null;
};

const carIdentity = (id: string, provider: string, modelName: string, search: CarSearchParams) => JSON.stringify([
  id, provider.trim().toLowerCase(), modelName.trim().toLowerCase(), search.pickupLocation.trim().toLowerCase(),
  search.dropoffLocation.trim().toLowerCase(), search.pickupDate, search.pickupTime, search.dropoffDate,
  search.dropoffTime, search.driverAge,
]);

function savedCarIdentity(item: SavedCarApiItem) {
  if (!item.payload || typeof item.payload !== "object" || !("searchParams" in item.payload)) return null;
  const search = item.payload.searchParams;
  if (!search || typeof search !== "object") return null;
  const params = search as CarSearchParams;
  const id = resultId(item);
  return id ? carIdentity(id, item.provider, item.modelName, params) : null;
}

export function useSavedCar(car: NormalizedCarResult, search: CarSearchParams) {
  const { data: session, status } = useSession();
  const owner = session?.user?.email ?? "authenticated-user";
  const offer = car.offers[0];
  const identity = offer ? carIdentity(car.id, offer.bookingProviderName || offer.rentalCompanyName || car.rentalCompanyName, car.modelName, search) : null;
  const [savedItem, setSavedItem] = useState<SavedCarApiItem | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") { clearSavedCarsCache(); queueMicrotask(() => setSavedItem(null)); return; }
    const update = () => setSavedItem(savedCarsCache?.find((item) => savedCarIdentity(item) === identity) ?? null);
    const invalidate = () => { clearSavedCarsCache(owner); void loadSavedCars(owner).then(update).catch(() => undefined); };
    void loadSavedCars(owner).then(update).catch(() => undefined);
    window.addEventListener(SAVED_CARS_CHANGED_EVENT, update);
    window.addEventListener(SAVED_CARS_INVALIDATED_EVENT, invalidate);
    return () => { window.removeEventListener(SAVED_CARS_CHANGED_EVENT, update); window.removeEventListener(SAVED_CARS_INVALIDATED_EVENT, invalidate); };
  }, [identity, owner, status]);

  async function toggleSavedCar() {
    if (pending) return;
    if (status !== "authenticated") { await signIn(undefined, { callbackUrl: window.location.href }); return; }
    const previous = savedItem;
    setPending(true);
    if (previous) setSavedItem(null);
    try {
      if (previous) {
        const response = await deleteBackendCar(previous.id);
        if (response.ok) publishSavedCars((savedCarsCache ?? []).filter((item) => item.id !== previous.id));
        else setSavedItem(previous);
        return;
      }
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
        driverAge: search.driverAge,
        totalPrice: offer.totalPrice,
        currency: offer.currency,
        payload: { result: car, searchParams: search },
      });
      if (response.ok && response.item) {
        const item = { ...response.item, type: "car" as const, resultId: car.id };
        publishSavedCars([...(savedCarsCache ?? []), item]);
      }
      else if (response.duplicate) {
        clearSavedCarsCache(owner);
        const refreshed = await fetchBackendSavedCars();
        if (refreshed.ok) publishSavedCars(refreshed.items ?? []);
      }
    } finally { setPending(false); }
  }

  return { isSaved: Boolean(savedItem), pending, toggleSavedCar };
}
