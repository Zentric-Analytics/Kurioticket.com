import { useEffect, useState } from "react";
import { usePathname, useSegments, useGlobalSearchParams } from "expo-router";
import { AppState, Platform } from "react-native";
import { randomUUID } from "expo-crypto";
import { pageViewKey, type PageViewKey } from "@/lib/pageViewCatalog";
import { travelApi } from "../../api/travelApi";
import { visitorIdentity } from "./visitorIdentity";
import { NativePageViewTracker } from "./nativePageViewTracker";

const tracker = new NativePageViewTracker({
  context: visitorIdentity.trackingContext,
  createId: randomUUID,
  send: (event, visitorContext, signal) => travelApi.pageView(event, { visitorContext, signal }),
});
visitorIdentity.subscribe(tracker.contextChanged);
const native = () => Platform.OS === "ios" || Platform.OS === "android";

export function recordNativeResultsPage(product: "flight" | "hotel" | "car", requestId: string | undefined) {
  if (native() && AppState.currentState === "active" && requestId) tracker.observeResult(`${product}_results`, requestId);
}
export function recordNativeHomeSection(product: "flights" | "hotels" | "cars" | "packages") {
  if (native() && AppState.currentState === "active") tracker.observeHomeSection(`home_${product}`);
}

export function useNativePageViews() {
  const pathname = usePathname();
  const segments = useSegments() as readonly string[];
  const params = useGlobalSearchParams();
  const [context, setContext] = useState(visitorIdentity.trackingContext);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const key: PageViewKey | null = (pathname === "/" && !segments.includes("(tabs)")) || pathname === "/home" ? null : pageViewKey(pathname, "native");
  // Result pages get their reference from the actual completed search, not from
  // user-supplied route parameters. Details still require server verification.
  const requestId = key?.endsWith("_details") && typeof params.journeyRequestId === "string" ? params.journeyRequestId : undefined;
  useEffect(() => {
    const update = () => setContext(visitorIdentity.trackingContext());
    const unsubscribe = visitorIdentity.subscribe(update);
    update();
    const appState = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => { unsubscribe(); appState.remove(); };
  }, []);
  useEffect(() => {
    if (!native() || visitorIdentity.trackingContext() !== context) return;
    tracker.observe(key, foreground && AppState.currentState === "active", requestId);
  }, [context, foreground, key, requestId]);
}
