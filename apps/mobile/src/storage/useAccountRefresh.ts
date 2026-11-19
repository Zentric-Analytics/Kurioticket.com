import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { readSession, subscribeSession } from "./sessionStorage";

/** Refresh on entry/resume/session replacement; never poll. Reset private
 * screen state on account change even when a retained screen is not focused. */
export function useAccountRefresh(refresh: () => void | Promise<unknown>, reset: () => void) {
  const callbacks = useRef({ refresh, reset }); callbacks.current = { refresh, reset };
  const owner = useRef<string | null | undefined>(undefined);
  const focused = useRef(false);
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSession(session => {
      const next = session?.user.id ?? null;
      if (owner.current !== next) callbacks.current.reset();
      owner.current = next;
      if (focused.current) void callbacks.current.refresh();
    });
    void readSession().then(session => { if (active && owner.current === undefined) owner.current = session?.user.id ?? null; }).catch(() => { if (active && owner.current === undefined) owner.current = null; });
    return () => { active = false; unsubscribe(); };
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true; void callbacks.current.refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void callbacks.current.refresh(); });
    return () => { focused.current = false; subscription.remove(); };
  }, []));
}
