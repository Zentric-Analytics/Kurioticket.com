import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/theme/tokens";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="email-auth" />
        <Stack.Screen name="home" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="connection-status" />
      </Stack>
    </>
  );
}
