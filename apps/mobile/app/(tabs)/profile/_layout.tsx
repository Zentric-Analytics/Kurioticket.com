import { ProfileThemeProvider } from "../../../src/theme/AppTheme";
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return <ProfileThemeProvider><Stack screenOptions={{ headerShown: false }} /></ProfileThemeProvider>;
}
