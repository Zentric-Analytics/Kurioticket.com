import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { RecoveryScreen } from "../src/features/launch/LaunchScreens";
import { runBootstrap, type BootstrapState } from "../src/launch/bootstrap";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function Index() {
  const [state, setState] = useState<BootstrapState>({ status: "initializing" });
  const bootstrapId = useRef(0);

  const bootstrap = useCallback(() => {
    const runId = ++bootstrapId.current;
    setState({ status: "initializing" });
    void SplashScreen.preventAutoHideAsync().catch(() => undefined);
    void runBootstrap()
      .then((nextState) => {
        if (runId === bootstrapId.current) setState(nextState);
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") console.warn("[mobile-bootstrap] unexpected bootstrap failure", error);
        if (runId === bootstrapId.current) setState({ status: "offline" });
      });
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  useEffect(() => {
    if (state.status === "ready-first-run") {
      router.replace("/onboarding");
      requestAnimationFrame(() => void SplashScreen.hideAsync().catch(() => undefined));
      return;
    }
    if (state.status === "ready-guest" || state.status === "ready-authenticated-reserved") {
      router.replace("/(tabs)");
      requestAnimationFrame(() => void SplashScreen.hideAsync().catch(() => undefined));
      return;
    }
    if (state.status === "offline" || state.status === "configuration-error") {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [state.status]);

  if (state.status === "configuration-error") return <RecoveryScreen type="configuration" onRetry={bootstrap} />;
  if (state.status === "offline") return <RecoveryScreen type="offline" onRetry={bootstrap} />;
  return null;
}
