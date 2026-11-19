import { useRef } from "react";

export function retainPickerContext<T>(active: boolean, current: T, previous: T | undefined): T {
  return active || previous === undefined ? current : previous;
}

export function useRetainedPickerContext<T>(active: boolean, current: T): T {
  const retained = useRef<T | undefined>(undefined);
  const presented = retainPickerContext(active, current, retained.current);
  if (active) retained.current = current;
  return presented;
}
