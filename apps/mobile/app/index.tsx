import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { RecoveryScreen } from "../src/features/launch/LaunchScreens";
import { runBootstrap, type BootstrapState } from "../src/launch/bootstrap";
import { restoreAuthenticatedSession } from "../src/features/auth/authApi";
import { getStartupRoute } from "../src/launch/startupRoute";
import { ensureLatestUpdate } from "../src/updates/ensureLatestUpdate";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function Index() {
  const [state, setState] = useState<BootstrapState>({ status: "initializing" });
  const bootstrapId = useRef(0);

  const bootstrap = useCallback((isRetry = false) => {
    const runId = ++bootstrapId.current;
    if (!isRetry) setState({ status: "initializing" });

    void (isRetry ? Promise.resolve() : ensureLatestUpdate(Updates))
      .then(() => runBootstrap({ restoreAuthenticatedSession }))
      .then((nextState) => {
        if (runId === bootstrapId.current) setState(nextState);
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") console.warn("[mobile-bootstrap] unexpected bootstrap failure", error);
        if (runId === bootstrapId.current) setState({ status: "offline" });
      });
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const route = getStartupRoute(state.status);
    if (route) {
      router.replace(route);
      requestAnimationFrame(() => void SplashScreen.hideAsync().catch(() => undefined));
      return;
    }
    if (state.status === "offline" || state.status === "configuration-error") {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [state.status]);

  if (state.status === "configuration-error") {
    return <RecoveryScreen type="configuration" onRetry={() => bootstrap(true)} />;
  }
  if (state.status === "offline") {
    return <RecoveryScreen type="offline" onRetry={() => bootstrap(true)} />;
  }
  return null;
}
