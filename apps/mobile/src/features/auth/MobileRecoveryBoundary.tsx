import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { authApi } from "./authApi";
import { travelApi } from "../../api/travelApi";
import { clearSession, readSession, subscribeSession, type StoredSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";

/** UI restriction supplements the server's permanently ordinary-invalid bearer. */
export function MobileRecoveryBoundary({ children }: { children: ReactNode }) {
  const { theme } = useAppTheme();
  const [session, setSession] = useState<StoredSession | null | undefined>(undefined);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [returning, setReturning] = useState(false);
  const [deadline, setDeadline] = useState("");
  useEffect(() => {
    let current = true, changed = false, hadRecovery = false;
    const unsubscribe = subscribeSession(value => { changed = true; if (current) { if (!value && hadRecovery) setReturning(true); hadRecovery = Boolean(value?.recovery); setSession(value); setVerified(false); setComplete(false); setError(""); } });
    void readSession().then(value => { if (current && !changed) { hadRecovery = Boolean(value?.recovery); setSession(value); } }).catch(() => { if (current && !changed) setSession(null); });
    return () => { current = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!session?.recovery || complete) return;
    let current = true;
    let timer: ReturnType<typeof setTimeout>;
    const expire = () => { if (current) { setVerified(false); setError("Recovery sign-in expired. Sign in again."); } };
    const armExpiry = (expiry: number) => { clearTimeout(timer); timer = setTimeout(expire, Math.max(0, expiry - Date.now())); };
    armExpiry(Date.parse(session.expires));
    void authApi.recoveryStatus().then(result => {
      if (!current) return;
      const expiry = Math.min(Date.parse(session.expires), Date.parse(result.expires), Date.parse(result.recovery?.deadline || ""));
      if (!result.recovery || !Number.isFinite(expiry) || expiry <= Date.now()) { expire(); return; }
      armExpiry(expiry); setDeadline(result.recovery.deadline); setVerified(true);
    }).catch(() => { if (current) setError("Unable to verify recovery access. Sign in again or check your connection."); });
    return () => { current = false; clearTimeout(timer); };
  }, [session, complete]);
  useEffect(() => { if (returning && session === null) router.replace("/email-auth"); }, [returning, session]);
  // Cold-start recovery replaces index/Stack, so index cannot hide the splash.
  useEffect(() => { if (session?.recovery) void SplashScreen.hideAsync().catch(() => undefined); }, [session]);
  if (session === undefined) return <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center" }}><ActivityIndicator accessibilityLabel="Checking sign-in" /></View>;
  if (!session?.recovery) return <>{children}</>;
  async function signIn() {
    if (busy) return;
    try { await clearSession(); setReturning(true); }
    catch { setError("Unable to clear recovery sign-in. Please try again."); }
  }
  async function recover() {
    if (!verified || busy || complete) return;
    setBusy(true); setError("");
    try { await travelApi.reactivateDeletion(); setComplete(true); setVerified(false); }
    catch { setError("Account recovery could not be completed. Check your connection or sign in again."); }
    finally { setBusy(false); }
  }
  const button = (label: string, action: () => void, disabled: boolean) => <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy }} disabled={disabled} onPress={action} style={{ minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: disabled ? theme.border : "#2563EB", marginTop: 16 }}><Text style={{ color: disabled ? theme.muted : "#FFFFFF", fontWeight: "700", textAlign: "center" }}>{label}</Text></Pressable>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
    <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 24, fontWeight: "700" }}>{complete ? "Account recovered" : "Account recovery only"}</Text>
    <Text style={{ color: theme.text, marginTop: 16 }}>{complete ? "Your deletion request was cancelled. Sign in again to use your account." : "Your account is pending deletion. This sign-in can only keep your account; ordinary account access is unavailable."}</Text>
    {!complete ? <Text style={{ color: theme.muted, marginTop: 12 }}>Recovery deadline: {new Date(deadline || session.recovery.deadline).toLocaleString()}</Text> : null}
    {!verified && !error && !complete ? <ActivityIndicator accessibilityLabel="Verifying recovery access" style={{ marginTop: 16 }} /> : null}
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: "#B91C1C", marginTop: 16 }}>{error}</Text> : null}
    {!complete ? button(busy ? "Recovering…" : "Keep account", () => void recover(), busy || !verified) : null}
    {button(complete ? "Sign in to continue" : "Return to sign-in", () => void signIn(), busy)}
  </ScrollView></SafeAreaView>;
}
