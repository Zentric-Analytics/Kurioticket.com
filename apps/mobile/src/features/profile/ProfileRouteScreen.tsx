import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { readSession } from "../../storage/sessionStorage";
import { readOnboardingCompleted } from "../../storage/onboardingStorage";
import { AuthenticatedProfileScreen } from "./ProfileScreen";
import { GuestProfileScreen } from "./GuestProfileScreen";

type ProfileState = "loading" | "authenticated" | "guest" | "signed-out";
export function ProfileRouteScreen() {
  const [state, setState] = useState<ProfileState>("loading");
  useEffect(() => {
    let active = true;
    void Promise.all([readSession().catch(() => null), readOnboardingCompleted().catch(() => false)]).then(([session, guest]) => {
      if (active) setState(session ? "authenticated" : guest ? "guest" : "signed-out");
    });
    return () => { active = false; };
  }, []);
  if (state === "loading") return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#0754F7" /></View>;
  if (state === "authenticated") return <AuthenticatedProfileScreen />;
  if (state === "guest") return <GuestProfileScreen />;
  return <Redirect href="/email-auth" />;
}
