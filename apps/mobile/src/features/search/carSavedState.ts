import { useSyncExternalStore } from "react";

const saved = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = (id: string) => saved.has(id);

export const isCarSaved = (id: string) => saved.has(id);
export const setCarSaved = (id: string, value: boolean) => {
  if (value) saved.add(id); else saved.delete(id);
  listeners.forEach((listener) => listener());
};

export function useSavedCar(id: string) {
  const selected = useSyncExternalStore(subscribe, () => snapshot(id), () => false);
  const toggle = () => setCarSaved(id, !saved.has(id));
  return { saved: selected, toggle };
}
