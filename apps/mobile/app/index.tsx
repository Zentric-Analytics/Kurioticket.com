import { useCallback, useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { runBootstrap, type BootstrapState } from "../src/launch/bootstrap";
import { GuestAppScreen, LoadingScreen, OnboardingScreen, RecoveryScreen } from "../src/features/launch/LaunchScreens";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function Index() {
  const [state, setState] = useState<BootstrapState>({ status: "initializing" });

  const bootstrap = useCallback(() => {
    setState({ status: "initializing" });
    void runBootstrap()
      .then(setState)
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") console.warn("[mobile-bootstrap] unexpected bootstrap failure", error);
        setState({ status: "offline" });
      });
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  useEffect(() => {
    if (state.status !== "initializing") {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [state.status]);

  if (state.status === "initializing") return <LoadingScreen />;
  if (state.status === "ready-first-run") return <OnboardingScreen onGuest={() => setState({ status: "ready-guest", config: state.config })} />;
  if (state.status === "ready-guest" || state.status === "ready-authenticated-reserved") return <GuestAppScreen config={state.config} />;
  if (state.status === "configuration-error") return <RecoveryScreen type="configuration" onRetry={bootstrap} />;
  return <RecoveryScreen type="offline" onRetry={bootstrap} />;
}
