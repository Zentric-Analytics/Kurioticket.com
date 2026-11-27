import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { getApiBaseUrl } from "../../config/apiUrl";
import { readStoredSession, subscribeStoredSession } from "../../storage/sessionStorage";
import { createNativePresenceClient } from "./nativePresenceClient";
import { visitorIdentity } from "./visitorIdentity";
import { readExistingGuestOperationalSearchCredential, subscribeOperationalSearchCredential } from "../../api/travelApi";

export function useNativePresence() {
  useEffect(() => {
    const platform = Platform.OS;
    if (platform !== "ios" && platform !== "android") return;
    const api = getApiBaseUrl(platform, __DEV__);
    if (!api.ok) return;

    const readGuestCredentials = api.baseUrl === "https://staging.kurioticket.com" ? () => ({
      visitorToken: visitorIdentity.existingGuestToken(),
      operationalSearchCredential: readExistingGuestOperationalSearchCredential(),
    }) : undefined;
    const client = createNativePresenceClient(api.baseUrl, platform, undefined, readGuestCredentials);
    let guestVisitorContext = readGuestCredentials && visitorIdentity.existingGuestToken() ? visitorIdentity.trackingContext() : null;
    const unsubscribeVisitor = readGuestCredentials ? visitorIdentity.subscribe(() => {
      const next = visitorIdentity.existingGuestToken() ? visitorIdentity.trackingContext() : null;
      if (next === guestVisitorContext) return;
      guestVisitorContext = next;
      client.refreshGuestCredentials();
    }) : () => {};
    const unsubscribeOperational = readGuestCredentials
      ? subscribeOperationalSearchCredential(() => client.refreshGuestCredentials()) : () => {};
    let state = AppState.currentState;
    let focused = true;
    let disposed = false;
    let sessionRevision = 0;
    let sessionReady = false;

    const refreshSession = () => {
      const revision = sessionRevision;
      // Keep recovery/expired stored accounts distinct from an explicit guest.
      void readStoredSession().then(session => {
        if (disposed || revision !== sessionRevision) return;
        sessionReady = true;
        client.setSession(session);
      }).catch(() => undefined);
    };
    const unsubscribe = subscribeStoredSession(session => {
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
      unsubscribeVisitor();
      unsubscribeOperational();
      appState.remove();
      androidFocus.forEach(subscription => subscription.remove());
      client.stop();
    };
  }, []);
}
