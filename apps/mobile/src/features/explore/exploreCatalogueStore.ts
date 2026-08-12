import { useEffect, useSyncExternalStore } from "react";
import type { MobileExploreCatalogue } from "../../api/exploreCatalogueContract";
import { bundledExploreCatalogue } from "./bundledExploreCatalogue";
import { loadExploreCatalogue } from "./exploreCatalogueRepository";

let currentCatalogue = bundledExploreCatalogue;
let started = false;
const listeners = new Set<() => void>();

function publish(catalogue: MobileExploreCatalogue) {
  if (catalogue.version === currentCatalogue.version) return;
  currentCatalogue = catalogue;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentCatalogue;
}

export function startExploreCatalogueSync() {
  if (started) return;
  started = true;

  void loadExploreCatalogue()
    .then(({ initial, refresh }) => {
      publish(initial.catalogue);
      void refresh.then((live) => {
        if (live) publish(live);
      });
    })
    .catch(() => undefined);
}

export function useExploreCatalogue() {
  const catalogue = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    startExploreCatalogueSync();
  }, []);
  return catalogue;
}

export function getCurrentExploreCatalogue() {
  return currentCatalogue;
}
