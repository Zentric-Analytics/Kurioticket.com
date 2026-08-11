import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Alert } from "react-native";
import { queueSavedDestinationIds, readSavedDestinationIds } from "./savedDestinationsStorage";
import { SavedDestinationsStore } from "./savedDestinationsStore";
import { readSession } from "./sessionStorage";
import { favoriteAction } from "./favoriteAccess";

const stores = new Map<string, SavedDestinationsStore>();
function storeFor(userId: string) {
  let store = stores.get(userId);
  if (!store) {
    store = new SavedDestinationsStore(() => readSavedDestinationIds(userId), (ids) => queueSavedDestinationIds(userId, ids));
    stores.set(userId, store);
  }
  return store;
}

export function showFavoriteSignInPrompt() {
  Alert.alert("Sign in to save favorites", "Create an account or sign in to save your favorites and view them later.", [
    { text: "Not now", style: "cancel" },
    { text: "Sign in", onPress: () => router.push("/(tabs)/profile/sign-in") },
  ]);
}

export function useSavedDestinations() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [savedState, setSavedState] = useState<{ userId: string | null; ids: Set<string> }>({ userId: null, ids: new Set() });
  const refresh = useCallback(() => { void readSession().then((session) => setUserId(session?.user.id ?? null)).catch(() => setUserId(null)).finally(() => setAuthResolved(true)); }, []);
  useEffect(() => {
    if (!userId) { setSavedState({ userId: null, ids: new Set() }); return; }
    const store = storeFor(userId);
    setSavedState({ userId, ids: store.snapshot() });
    const unsubscribe = store.subscribe((ids) => setSavedState({ userId, ids }));
    void store.refresh().catch(() => undefined);
    return unsubscribe;
  }, [userId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const toggle = useCallback((id: string) => {
    if (favoriteAction(userId) === "sign-in" || !userId) { showFavoriteSignInPrompt(); return; }
    void storeFor(userId).toggle(id).catch(() => undefined);
  }, [userId]);
  return { savedIds: savedState.userId === userId ? savedState.ids : new Set<string>(), toggle, refresh, isAuthenticated: !!userId, authResolved };
}
