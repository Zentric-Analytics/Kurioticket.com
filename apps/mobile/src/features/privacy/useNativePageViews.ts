import { useCallback, useEffect } from "react";
import { useNavigationContainerRef } from "expo-router";
import { AppState, Platform } from "react-native";
import { randomUUID } from "expo-crypto";
import { travelApi } from "../../api/travelApi";
import { journeyEvents } from "./journeyEvents";
import { visitorIdentity } from "./visitorIdentity";
import { activeNativeScreen, NativePageViewTracker } from "./nativePageViewTracker";

const tracker = new NativePageViewTracker({
  context: visitorIdentity.trackingContext,
  createId: randomUUID,
  send: (event, visitorContext, signal) => travelApi.pageView(event, { visitorContext, signal }),
});
visitorIdentity.subscribe(tracker.contextChanged);
const native = () => Platform.OS === "ios" || Platform.OS === "android";

export function useNativeResultsPage() {
  const navigation = useNavigationContainerRef();
  return useCallback((product: "flight" | "hotel" | "car" | "package", requestId: string | undefined) => {
    if (!native() || AppState.currentState !== "active" || !navigation.isReady() || !journeyEvents.hasSearch(requestId)) return;
    const screen = activeNativeScreen(navigation.getRootState());
    if (screen?.pageKey === `${product}_results`) tracker.observeResult(screen.pageKey, requestId, screen.instance);
  }, [navigation]);
}

export function recordNativeHomeSection(product: "flights" | "hotels" | "cars" | "packages") {
  if (native() && AppState.currentState === "active") tracker.observeHomeSection(`home_${product}`);
}

export function useNativePageViews() {
  const navigation = useNavigationContainerRef();
  useEffect(() => {
    if (!native()) return;
    const observe = (visible = AppState.currentState === "active") => {
      if (!navigation.isReady()) return;
      const screen = activeNativeScreen(navigation.getRootState());
      if (screen) tracker.observe(screen.pageKey, visible, screen.requestId, screen.instance);
    };
    const unsubscribeContext = visitorIdentity.subscribe(() => observe());
    const unsubscribeState = navigation.addListener("state", () => observe());
    const unsubscribeReady = navigation.addListener("ready", () => observe());
    const appState = AppState.addEventListener("change", state => observe(state === "active"));
    observe();
    return () => {
      unsubscribeContext();
      unsubscribeState();
      unsubscribeReady();
      appState.remove();
    };
  }, [navigation]);
}
