import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { authApi, reconcileOrdinarySession } from "./authApi";
import { travelApi } from "../../api/travelApi";
import { clearSession, readStoredSession, subscribeStoredSession, type StoredSession } from "../../storage/sessionStorage";
import { writeProfileName } from "../../storage/profileNameCache";
import { discardSavedCache } from "../../storage/savedRepository";
import { useAppTheme } from "../../theme/AppTheme";
import { RecoveryScreen } from "../launch/LaunchScreens";

/** UI restriction supplements the server's permanently ordinary-invalid bearer. */
export function MobileRecoveryBoundary({ children }: { children: ReactNode }) {
  const { theme } = useAppTheme();
  const [session, setSession] = useState<StoredSession | null | undefined>(undefined);
  const [verifiedUntil, setVerifiedUntil] = useState(0);
  const [retry, setRetry] = useState(0);
  const [restoreError, setRestoreError] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [returning, setReturning] = useState(false);
  const [navigationRevision, setNavigationRevision] = useState(0);
  const verified = verifiedUntil > Date.now();
  useEffect(() => {
    let current = true;
    let revision = 0;
    let hadRecovery = false;
    let initialized = false;
    const show = (value: StoredSession | null, revokedUserId?: string) => {
      if (!value && (hadRecovery || revokedUserId)) {
        setNavigationRevision(version => version + 1);
        setReturning(true);
      }
      hadRecovery = Boolean(value?.recovery);
      const cacheOwner = revokedUserId ?? (value?.recovery ? value.user.id : undefined);
      if (cacheOwner) {
        void writeProfileName(cacheOwner, null).catch(() => undefined);
        void discardSavedCache(cacheOwner).catch(() => undefined);
      }
      initialized = true;
      setSession(value);
      setVerifiedUntil(0);
      setComplete(false);
      setError("");
      setRestoreError(false);
    };
    const unsubscribe = subscribeStoredSession((value, revokedUserId) => { revision++; show(value, revokedUserId); });
    const restore = async () => {
      const started = ++revision;
      try {
        const stored = await readStoredSession();
        if (!current || started !== revision) return;
        const value = stored && !stored.recovery ? await reconcileOrdinarySession(stored) : stored;
        if (current && started === revision && !initialized) show(value);
      } catch {
        if (current && started === revision && !initialized) setRestoreError(true);
      }
    };
    void restore();
    const foreground = AppState.addEventListener("change", state => { if (state === "active") void restore(); });
    return () => { current = false; unsubscribe(); foreground.remove(); };
  }, [retry]);
  useEffect(() => {
    if (!session?.recovery || complete) return;
    let current = true;
    let timer: ReturnType<typeof setTimeout>;
    const expire = () => { if (current) { setVerifiedUntil(0); setError("Recovery sign-in expired. Sign in again."); } };
    const armExpiry = (expiry: number) => { clearTimeout(timer); timer = setTimeout(expire, Math.max(0, expiry - Date.now())); };
    const storedExpiry = Math.min(Date.parse(session.expires), Date.parse(session.recovery.deadline));
    if (!Number.isFinite(storedExpiry) || storedExpiry <= Date.now()) { expire(); return; }
    armExpiry(storedExpiry);
    void authApi.recoveryStatus(session.token).then(result => {
      if (!current) return;
      const expiry = Math.min(storedExpiry, Date.parse(result.expires), Date.parse(result.recovery?.deadline || ""));
      if (!result.recovery || !Number.isFinite(expiry) || expiry <= Date.now()) { expire(); return; }
      armExpiry(expiry); setVerifiedUntil(expiry);
    }).catch(() => { if (current) setError("To keep your account, sign in again or check your connection."); });
    return () => { current = false; clearTimeout(timer); };
  }, [session, complete]);
  useEffect(() => {
    if (!returning || session !== null) return;
    router.replace("/email-auth");
    setReturning(false);
  }, [returning, session]);
  // Cold-start recovery replaces index/Stack, so index cannot hide the splash.
  useEffect(() => { if (session?.recovery || restoreError) void SplashScreen.hideAsync().catch(() => undefined); }, [session, restoreError]);
  if (restoreError) return <RecoveryScreen type="offline" onRetry={() => { setRestoreError(false); setRetry(value => value + 1); }} />;
  if (session === undefined) return <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center" }}><ActivityIndicator accessibilityLabel="Checking sign-in" /></View>;
  if (!session?.recovery) return <Fragment key={navigationRevision}>{children}</Fragment>;
  const recoveryToken = session.token;
  async function signIn() {
    if (busy) return;
    try { await clearSession(); }
    catch { setError("Unable to clear recovery sign-in. Please try again."); }
  }
  async function recover() {
    if (!verified || verifiedUntil <= Date.now() || busy || complete) return;
    setBusy(true); setError("");
    try { await travelApi.reactivateDeletion(recoveryToken); setComplete(true); setVerifiedUntil(0); setError(""); }
    catch { setError("Account recovery could not be completed. Check your connection or sign in again."); }
    finally { setBusy(false); }
  }
  const button = (label: string, action: () => void, disabled: boolean) => <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy }} disabled={disabled} onPress={action} style={{ minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: disabled ? theme.border : "#2563EB", marginTop: 16 }}><Text style={{ color: disabled ? theme.muted : "#FFFFFF", fontWeight: "700", textAlign: "center" }}>{label}</Text></Pressable>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
    <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 24, fontWeight: "700" }}>{complete ? "Account recovered" : "Account recovery only"}</Text>
    <Text style={{ color: theme.text, marginTop: 16 }}>{complete ? "Your deletion request was cancelled. Sign in again to use your account." : "Your account is pending deletion. Ordinary account access is unavailable."}</Text>
    {!complete ? <Text style={{ color: theme.muted, marginTop: 12 }}>Scheduled deletion date {new Date(session.recovery.deadline).toLocaleString()}</Text> : null}
    {!verified && !error && !complete ? <ActivityIndicator accessibilityLabel="Verifying recovery access" style={{ marginTop: 16 }} /> : null}
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: "#B91C1C", marginTop: 16 }}>{error}</Text> : null}
    {!complete ? button(busy ? "Recovering…" : "Keep account", () => void recover(), busy || !verified) : null}
    {button(complete ? "Sign in to continue" : "Return to sign-in", () => void signIn(), busy)}
  </ScrollView></SafeAreaView>;
}
