import { AuthFlow } from "../src/features/auth/AuthFlow";
import { useLocalSearchParams } from "expo-router";

export default function EmailAuthRoute() {
  const { entry, returnTo } = useLocalSearchParams<{ entry?: string; returnTo?: string }>();
  return <AuthFlow initialStep={entry === "email" ? "email" : "welcome"} successRoute={returnTo === "profile" ? "/(tabs)/profile" : "/"} />;
}
