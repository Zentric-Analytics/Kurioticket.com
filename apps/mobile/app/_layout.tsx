import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppThemeProvider, useAppTheme } from "../src/theme/AppTheme";

export default function RootLayout() {
  return <AppThemeProvider><ThemedRootLayout /></AppThemeProvider>;
}

function ThemedRootLayout() {
  const { theme } = useAppTheme();
  return (
    <>
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
        <Stack.Screen name="destination/[slug]" />
      </Stack>
    </>
  );
}
