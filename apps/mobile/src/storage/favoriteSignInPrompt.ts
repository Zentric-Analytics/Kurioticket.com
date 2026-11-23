import { router } from "expo-router";
import { Alert } from "react-native";
import { signInHref, type ProtectedRoute } from "../features/auth/signInIntent";

export function showFavoriteSignInPrompt(returnTo: ProtectedRoute = "/(tabs)/profile") {
  Alert.alert("Sign in to save favorites", "Create an account or sign in to save your favorites and view them later.", [
    { text: "Not now", style: "cancel" },
    { text: "Sign in", onPress: () => router.push(signInHref(returnTo)) },
  ]);
}
