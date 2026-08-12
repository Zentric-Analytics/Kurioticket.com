import { useCallback, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import type { MobileExploreCatalogue } from "../../api/exploreCatalogueContract";
import { bundledExploreCatalogue } from "./bundledExploreCatalogue";
import {
  getExploreCatalogueSnapshot,
  refreshExploreCatalogue,
} from "./exploreCatalogueRepository";

let currentCatalogue = bundledExploreCatalogue;
let hydrationPromise: Promise<void> | null = null;
let refreshPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(catalogue: MobileExploreCatalogue) {
  if (catalogue.version === currentCatalogue.version) return;
  currentCatalogue = catalogue;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return currentCatalogue;
}

function hydrateExploreCatalogue() {
  if (!hydrationPromise) {
    hydrationPromise = getExploreCatalogueSnapshot()
      .then((snapshot) => {
        publish(snapshot.catalogue);
      })
      .catch(() => undefined);
  }
  return hydrationPromise;
}

function refreshExploreCatalogueOnce() {
  if (!refreshPromise) {
    refreshPromise = refreshExploreCatalogue()
      .then((live) => {
        publish(live);
      })
      .catch(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export function startExploreCatalogueSync() {
  void hydrateExploreCatalogue().then(() => refreshExploreCatalogueOnce());
}

export function useExploreCatalogue() {
  const catalogue = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useFocusEffect(
    useCallback(() => {
      startExploreCatalogueSync();
    }, []),
  );
  return catalogue;
}

export function getCurrentExploreCatalogue() {
  return currentCatalogue;
}
