import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { authApi, AuthApiError } from "../auth/authApi";
import { requireGoogleWebClientId } from "../auth/googleConfig";
import { AuthIcon } from "../auth/AuthIcon";
import { useAppTheme } from "../../theme/AppTheme";
import { TravelIllustration } from "./TravelIllustration";

const BLUE = "#0754F7";
const NAVY = "#071A48";
const TERMS = "https://kurioticket.com/terms";
const PRIVACY = "https://kurioticket.com/privacy";
function GoogleG() {
  return <Svg width={23} height={23} viewBox="0 0 24 24" accessibilityElementsHidden><Path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6z" /><Path fill="#34A853" d="M12 22c2.7 0 5-.9 6.8-2.3l-3.3-2.6c-.9.6-2.1 1-3.5 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10.3 10.3 0 0 0 12 22z" /><Path fill="#FBBC05" d="M6.4 13.9A6.2 6.2 0 0 1 6 12c0-.7.1-1.3.4-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6z" /><Path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.8 9.8 0 0 0 3 7.4l3.4 2.7C7.2 7.7 9.4 5.9 12 5.9z" /></Svg>;
}
export function GuestSignInMethodScreen() {
  const { theme } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const google = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      requireGoogleWebClientId();
      const { startNativeGoogleSignIn } = await import("../auth/googleSignIn");
      const result = await startNativeGoogleSignIn();
      if (result.status === "cancelled") return;
      await authApi.google(result.idToken, result.nonce);
      router.replace("/(tabs)/profile");
    } catch (cause) {
      setError(cause instanceof AuthApiError || cause instanceof Error ? cause.message : "Google sign-in could not be completed.");
    } finally { setBusy(false); }
  };
  const legal = (url: string, label: string) => void Linking.openURL(url).catch(() => Alert.alert(`Unable to open ${label}`, "Check your connection and try again."));
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}><ScrollView contentContainerStyle={styles.scroll}>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back to guest Profile" onPress={() => router.back()} style={styles.back}><AuthIcon name="back" color={theme.icon} size={28} /></Pressable>
    <View style={styles.illustration}><TravelIllustration signIn /></View>
    <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Sign in to Kurioticket</Text>
    <Text style={[styles.body, { color: theme.muted }]}>Choose a sign-in method to access your trips,{"\n"}saved items, price alerts and more.</Text>
    <View style={styles.buttons}>
      <Pressable accessibilityRole="button" accessibilityLabel="Continue with Email" disabled={busy} onPress={() => router.push({ pathname: "/email-auth", params: { entry: "email", returnTo: "profile" } })} style={({ pressed }) => [styles.button, styles.emailButton, pressed && styles.pressed, busy && styles.disabled]}><AuthIcon name="mail" color="white" size={22} /><Text style={styles.emailText}>Continue with Email</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityState={{ busy }} disabled={busy} onPress={() => void google()} style={({ pressed }) => [styles.button, styles.googleButton, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed, busy && styles.disabled]}><GoogleG /><Text style={[styles.googleText, { color: theme.text }]}>Continue with Google</Text></Pressable>
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.divider}><View style={[styles.line, { backgroundColor: theme.border }]} /><Text style={[styles.or, { color: theme.muted }]}>or</Text><View style={[styles.line, { backgroundColor: theme.border }]} /></View>
    <View style={styles.legalRow}><AuthIcon name="lock" color={theme.muted} size={16} /><Text style={[styles.legal, { color: theme.muted }]}>By continuing, you agree to our <Text accessibilityRole="link" onPress={() => legal(TERMS, "Terms of Service")} style={styles.link}>Terms of Service</Text>{"\n"}and acknowledge our <Text accessibilityRole="link" onPress={() => legal(PRIVACY, "Privacy Policy")} style={styles.link}>Privacy Policy</Text>.</Text></View>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1 }, scroll: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 30 }, back: { width: 48, height: 48, justifyContent: "center" }, illustration: { height: 255, marginHorizontal: -26, marginTop: -8 },
  title: { textAlign: "center", fontSize: 25, lineHeight: 32, fontWeight: "800", marginTop: 12 }, body: { textAlign: "center", fontSize: 14, lineHeight: 20, marginTop: 8 },
  buttons: { gap: 12, marginTop: 43 }, button: { height: 55, borderRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, emailButton: { backgroundColor: BLUE }, googleButton: { borderWidth: 1 }, emailText: { color: "white", fontSize: 16, fontWeight: "700" }, googleText: { color: NAVY, fontSize: 16, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 62 }, line: { flex: 1, height: 1 }, or: { fontSize: 13 }, legalRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 9, marginTop: 28 }, legal: { textAlign: "center", fontSize: 11, lineHeight: 18 }, link: { color: BLUE, fontWeight: "700" }, error: { color: "#B42318", fontSize: 12, textAlign: "center", marginTop: 8 }, pressed: { opacity: .75 }, disabled: { opacity: .5 },
});
