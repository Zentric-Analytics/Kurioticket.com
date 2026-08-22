import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { AppThemeProvider, useAppTheme } from "../src/theme/AppTheme";
import { useEffect } from "react";
import { buildStartupLog } from "../src/diagnostics/buildDiagnostics";
import { getRuntimeDiagnostics } from "../src/diagnostics/runtimeDiagnostics";
import { AppState, View } from "react-native";
import { FeatureAvailabilityProvider } from "../src/features/availability/FeatureAvailability";
import { MobileLocalizationProvider } from "../src/localization/MobileLocalization";
import { createForegroundUpdateHandler, ensureLatestUpdate } from "../src/updates/ensureLatestUpdate";

export default function RootLayout() {
  useEffect(() => { console.info(buildStartupLog(getRuntimeDiagnostics())); }, []);
  useEffect(() => {
    const handleAppStateChange = createForegroundUpdateHandler(
      () => ensureLatestUpdate(Updates),
      AppState.currentState,
    );
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);
  return <AppThemeProvider><MobileLocalizationProvider><FeatureAvailabilityProvider><ThemedRootLayout /></FeatureAvailabilityProvider></MobileLocalizationProvider></AppThemeProvider>;
}

function ThemedRootLayout() {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={theme.dark ? "light" : "dark"} backgroundColor={theme.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="email-auth" options={{ gestureEnabled: false }} />
        <Stack.Screen name="home" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="connection-status" />
      </Stack>
    </View>
  );
}
