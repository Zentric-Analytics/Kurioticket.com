import { useCallback, useEffect, useState } from "react";
import { runBootstrap, type BootstrapState } from "../src/launch/bootstrap";
import { GuestAppScreen, LoadingScreen, OnboardingScreen, RecoveryScreen } from "../src/features/launch/LaunchScreens";
import { loadOptionalModule } from "../src/native/optionalModules";

type SplashScreenLike = {
  preventAutoHideAsync: () => Promise<boolean>;
  hideAsync: () => Promise<boolean>;
};

const SplashScreen = loadOptionalModule<SplashScreenLike>("expo-splash-screen");
void SplashScreen?.preventAutoHideAsync().catch(() => undefined);

export default function Index() {
  const [state, setState] = useState<BootstrapState>({ status: "initializing" });

  const bootstrap = useCallback(() => {
    setState({ status: "initializing" });
    void runBootstrap()
      .then(setState)
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") console.warn("[mobile-bootstrap] unexpected bootstrap failure", error);
        setState({ status: "offline" });
      })
      .finally(() => {
        void SplashScreen?.hideAsync().catch(() => undefined);
      });
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (state.status === "initializing") return <LoadingScreen />;
  if (state.status === "ready-first-run") return <OnboardingScreen onGuest={() => setState({ status: "ready-guest", config: state.config })} />;
  if (state.status === "ready-guest" || state.status === "ready-authenticated-reserved") return <GuestAppScreen config={state.config} />;
  if (state.status === "configuration-error") return <RecoveryScreen type="configuration" onRetry={bootstrap} />;
  return <RecoveryScreen type="offline" onRetry={bootstrap} />;
}
