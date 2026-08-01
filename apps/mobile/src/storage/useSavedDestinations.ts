import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { queueSavedDestinationIds, readSavedDestinationIds } from "./savedDestinationsStorage";
import { SavedDestinationsStore } from "./savedDestinationsStore";

const store = new SavedDestinationsStore(readSavedDestinationIds, queueSavedDestinationIds);

export function useSavedDestinations() {
  const [ids, setIds] = useState(store.snapshot());
  const refresh = useCallback(() => { void store.refresh().catch(() => undefined); }, []);
  useEffect(() => { const unsubscribe = store.subscribe(setIds); refresh(); return unsubscribe; }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const toggle = useCallback((id: string) => {
    void store.toggle(id).catch(() => undefined);
  }, []);
  return { savedIds: ids, toggle, refresh };
}
