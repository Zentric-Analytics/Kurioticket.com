import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { queueSavedDestinationIds, readSavedDestinationIds } from "./savedDestinationsStorage";

let current = new Set<string>();
const listeners = new Set<(ids: Set<string>) => void>();
const publish = (ids: Set<string>) => { current = ids; listeners.forEach((listener) => listener(new Set(ids))); };

export function useSavedDestinations() {
  const [ids, setIds] = useState(new Set(current));
  const refresh = useCallback(() => { void readSavedDestinationIds().then((value) => publish(new Set(value))).catch(() => undefined); }, []);
  useEffect(() => { listeners.add(setIds); refresh(); return () => { listeners.delete(setIds); }; }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const toggle = useCallback((id: string) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    publish(next);
    void queueSavedDestinationIds([...next]).catch(() => refresh());
  }, [refresh]);
  return { savedIds: ids, toggle, refresh };
}
