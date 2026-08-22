import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { readSession, subscribeSession } from "../../storage/sessionStorage";
import { readOnboardingCompleted } from "../../storage/onboardingStorage";
import { AuthenticatedProfileScreen } from "./ProfileScreen";
import { GuestProfileScreen } from "./GuestProfileScreen";
import { startProfileSessionReconciliation } from "./profileSessionReconciliation";

type ProfileState = "loading" | "authenticated" | "guest" | "signed-out";
export function ProfileRouteScreen() {
  const [state, setState] = useState<ProfileState>("loading");
  useEffect(() => {
    return startProfileSessionReconciliation({
      readSession,
      readOnboardingCompleted,
      subscribeSession,
      onState: setState,
    });
  }, []);
  if (state === "loading") return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#0754F7" /></View>;
  if (state === "authenticated") return <AuthenticatedProfileScreen />;
  if (state === "guest") return <GuestProfileScreen />;
  return <Redirect href="/email-auth" />;
}
