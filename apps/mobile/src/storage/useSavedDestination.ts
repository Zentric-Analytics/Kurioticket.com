import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { readSavedDestinationIds, writeSavedDestinationIds } from "./savedDestinationsStorage";

export function useSavedDestination(id: string) {
  const [saved, setSaved] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    void readSavedDestinationIds().then((ids) => { if (active) setSaved(ids.includes(id)); }).catch(() => undefined);
    return () => { active = false; };
  }, [id]));

  const toggle = useCallback(() => {
    setSaved((current) => {
      const next = !current;
      void readSavedDestinationIds().then((ids) => {
        const values = new Set(ids);
        next ? values.add(id) : values.delete(id);
        return writeSavedDestinationIds([...values]);
      }).catch(() => undefined);
      return next;
    });
  }, [id]);
  return { saved, toggle };
}
