import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { AppThemeProvider, useAppTheme } from "../src/theme/AppTheme";
import { useEffect } from "react";
import { buildStartupLog } from "../src/diagnostics/buildDiagnostics";
import { getRuntimeDiagnostics } from "../src/diagnostics/runtimeDiagnostics";
import { AppState, View } from "react-native";
import { FeatureAvailabilityProvider } from "../src/features/availability/FeatureAvailability";
import { MobileLocalizationProvider } from "../src/localization/MobileLocalizationProvider";
import { createForegroundUpdateHandler, ensureLatestUpdate } from "../src/updates/ensureLatestUpdate";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });
  useEffect(() => { console.info(buildStartupLog(getRuntimeDiagnostics())); }, []);
  useEffect(() => {
    const handleAppStateChange = createForegroundUpdateHandler(
      () => ensureLatestUpdate(Updates),
      AppState.currentState,
    );
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (fontError && __DEV__) console.warn("Inter fonts failed to load; continuing with system fonts.");
    SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
        <Stack.Screen name="hotel-results" options={{ gestureEnabled: true }} />
      </Stack>
    </View>
  );
}
