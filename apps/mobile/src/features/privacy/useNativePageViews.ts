import { useEffect, useState } from "react";
import { usePathname } from "expo-router";
import { AppState, Platform } from "react-native";
import { randomUUID } from "expo-crypto";
import { createPageViewObserver } from "@/lib/pageViewCatalog";
import { travelApi } from "../../api/travelApi";
import { visitorIdentity } from "./visitorIdentity";

/** Optional native screen observations. No history before consent; no query
 * parameters or dynamic route identifiers ever enter the event body. */
export function useNativePageViews() {
  const pathname = usePathname();
  const [observe] = useState(() => createPageViewObserver());
  const [context, setContext] = useState(visitorIdentity.trackingContext);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const update = () => setContext(visitorIdentity.trackingContext());
    const unsubscribe = visitorIdentity.subscribe(update);
    update();
    const appState = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => { unsubscribe(); appState.remove(); };
  }, []);
  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    const current = visitorIdentity.trackingContext();
    const event = observe({
      pathname, transport: "native", context: current === context ? context : null,
      visible: foreground && AppState.currentState === "active",
    });
    if (!event || current === null || current !== visitorIdentity.trackingContext()) return;
    void travelApi.pageView({ ...event, eventId: randomUUID() }, { visitorContext: current }).catch(() => undefined);
  }, [context, foreground, observe, pathname]);
}
