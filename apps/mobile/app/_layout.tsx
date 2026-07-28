import { Stack } from "expo-router";
import { colors } from "../src/theme/tokens";
export default function RootLayout() { return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.navy, headerTitleStyle: { fontWeight: "800" }, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="email-auth" options={{ headerShown: false, gestureEnabled: false }} /></Stack>; }
