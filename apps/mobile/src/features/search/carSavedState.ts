import { useSyncExternalStore } from "react";

const saved = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = (id: string) => saved.has(id);

export function useSavedCar(id: string) {
  const selected = useSyncExternalStore(subscribe, () => snapshot(id), () => false);
  const toggle = () => {
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    listeners.forEach((listener) => listener());
  };
  return { saved: selected, toggle };
}
