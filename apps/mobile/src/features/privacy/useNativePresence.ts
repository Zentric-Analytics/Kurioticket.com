import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { getApiBaseUrl } from "../../config/apiUrl";
import { readSession, subscribeSession } from "../../storage/sessionStorage";
import { createNativePresenceClient } from "./nativePresenceClient";

export function useNativePresence() {
  const clientRef = useRef<ReturnType<typeof createNativePresenceClient> | null>(null);

  useEffect(() => {
    const platform = Platform.OS;
    if (platform !== "ios" && platform !== "android") return;
    const api = getApiBaseUrl(platform, __DEV__);
    if (!api.ok) return;

    const client = createNativePresenceClient(api.baseUrl, platform);
    clientRef.current = client;
    let state = AppState.currentState;
    let focused = true;
    let disposed = false;
    let sessionRevision = 0;
    let sessionReady = false;

    const refreshSession = () => {
      const revision = sessionRevision;
      void readSession().then(session => {
        if (disposed || revision !== sessionRevision) return;
        sessionReady = true;
        client.setSession(session);
      }).catch(() => undefined);
    };
    const unsubscribe = subscribeSession(session => {
      sessionRevision++;
      sessionReady = true;
      client.setSession(session);
    });
    const syncForeground = () => client.setForeground(state === "active" && focused);
    const appState = AppState.addEventListener("change", next => {
      if (next === "active" && state !== "active") focused = true;
      state = next;
      syncForeground();
      if (next === "active" && !sessionReady) refreshSession();
    });
    const androidFocus = platform === "android" ? [
      AppState.addEventListener("focus", () => { focused = true; syncForeground(); }),
      AppState.addEventListener("blur", () => { focused = false; syncForeground(); }),
    ] : [];
    syncForeground();
    refreshSession();

    return () => {
      disposed = true;
      unsubscribe();
      appState.remove();
      androidFocus.forEach(subscription => subscription.remove());
      client.stop();
      clientRef.current = null;
    };
  }, []);

  return useCallback(() => clientRef.current?.noteActivity(), []);
}
