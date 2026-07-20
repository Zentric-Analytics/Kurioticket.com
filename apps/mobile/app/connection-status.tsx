import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { DevBadge } from "../src/components/DevBadge";
import { Screen } from "../src/components/Screen";
import { getMobileConfig, getMobileHealth, type ConfigResponse } from "../src/api/mobileApi";
import { colors } from "../src/theme/tokens";

type State = "checking" | "connected" | "disconnected";
const safeMessage = "Kurioticket services could not be reached. Check the API URL and try again.";
const featureLabels: Record<keyof ConfigResponse["data"]["features"], string> = { flights: "Flights", hotels: "Hotels", cars: "Cars", pushNotifications: "Push notifications", socialAuthentication: "Social authentication", premiumSubscriptions: "Premium subscriptions" };

export default function ConnectionStatus() {
  const [state, setState] = useState<State>("checking");
  const [config, setConfig] = useState<ConfigResponse["data"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const refresh = useCallback(async (showChecking = true) => {
    if (showChecking) setState("checking");
    setMessage(null);
    const [health, configResult] = await Promise.all([getMobileHealth(), getMobileConfig()]);
    if (health.ok && configResult.ok && health.data.data.available) {
      setState("connected"); setConfig(configResult.data.data); setLastRefresh(new Date().toLocaleTimeString());
    } else { setState("disconnected"); setMessage(!health.ok ? health.error.message : !configResult.ok ? configResult.error.message : safeMessage); }
  }, []);
  useEffect(() => { void refresh(false); }, [refresh]);
  return <Screen><Stack.Screen options={{ title: "Connection Status" }} /><DevBadge /><Text style={styles.title}>Backend connection</Text><View style={styles.statusCard}><Text style={[styles.state, state === "connected" ? styles.connected : state === "disconnected" ? styles.disconnected : styles.checking]}>{state === "checking" ? "Checking" : state === "connected" ? "Connected" : "Disconnected"}</Text>{state === "checking" ? <ActivityIndicator color={colors.blue} /> : null}{message ? <Text style={styles.error}>{message}</Text> : null}</View><View style={styles.card}><Row label="API version" value={config?.apiVersion ?? "Unavailable"} /><Row label="Maintenance mode" value={config ? yesNo(config.maintenanceMode) : "Unavailable"} /><Row label="Minimum supported app version" value={config?.minimumSupportedAppVersion ?? "Not set"} /><Row label="Latest app version" value={config?.latestAppVersion ?? "Not set"} /><Row label="Last successful refresh" value={lastRefresh ?? "Not refreshed yet"} /></View><View style={styles.card}><Text style={styles.section}>Feature availability</Text>{config ? Object.entries(config.features).map(([key, value]) => <Row key={key} label={featureLabels[key as keyof ConfigResponse["data"]["features"]]} value={value ? "Enabled" : "Disabled"} />) : <Text style={styles.muted}>Feature flags are unavailable until the backend connects.</Text>}</View><Pressable style={styles.button} onPress={() => void refresh()}><Text style={styles.buttonText}>Refresh</Text></Pressable></Screen>;
}
function yesNo(value: boolean) { return value ? "On" : "Off"; } function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }
const styles = StyleSheet.create({ title: { color: colors.navy, fontSize: 30, fontWeight: "900" }, statusCard: { borderRadius: 24, padding: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 }, state: { fontSize: 22, fontWeight: "900" }, connected: { color: colors.success }, disconnected: { color: colors.danger }, checking: { color: colors.warning }, error: { color: colors.danger, fontSize: 15, lineHeight: 22 }, card: { borderRadius: 24, padding: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 }, section: { color: colors.navy, fontSize: 20, fontWeight: "900" }, row: { gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 10 }, label: { color: colors.muted, fontSize: 13, fontWeight: "800", textTransform: "uppercase" }, value: { color: colors.navy, fontSize: 16, fontWeight: "800" }, muted: { color: colors.muted }, button: { minHeight: 54, borderRadius: 18, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontWeight: "900" } });
