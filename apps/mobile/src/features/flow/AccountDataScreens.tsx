import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { travelApi, TravelApiError, type MobilePriceAlert, type MobileProfile } from "../../api/travelApi";
import { readSession } from "../../storage/sessionStorage";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return <SafeAreaView style={flowStyles.safe} edges={["top"]}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" /></Pressable><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text></View>{children}</SafeAreaView>;
}
function State({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <View style={styles.center}><ActivityIndicator color={flowColors.blue} /><Text style={flowStyles.meta}>Loading…</Text></View>;
  if (error) return <View style={styles.center}><Text accessibilityRole="alert" style={flowStyles.meta}>{error}</Text><Pressable onPress={retry} style={flowStyles.primary}><Text style={flowStyles.primaryText}>Try again</Text></Pressable></View>;
  return null;
}
export function PersonalInformationScreen() {
  const [profile, setProfile] = useState<MobileProfile | null>(null); const [email, setEmail] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const data = await travelApi.profile(); setProfile(data.profile); setEmail(data.user.email); } catch (e) { const session = await readSession().catch(() => null); if (!session) { router.replace("/email-auth"); return; } setError(e instanceof TravelApiError ? e.message : "Unable to load profile."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <Shell title="Personal information"><State loading={loading} error={error} retry={() => void load()} />{!loading && !error ? <ScrollView contentContainerStyle={flowStyles.scroll}>{[["Name", profile?.fullName || "Not provided"], ["Email", email], ["Phone", [profile?.phoneCountryCode, profile?.phoneNumber].filter(Boolean).join(" ") || "Not provided"], ["Date of birth", profile?.dateOfBirth || "Not provided"], ["Nationality", profile?.nationality || "Not provided"], ["Address", profile?.address || "Not provided"]].map(([label, value]) => <View key={label} style={styles.row}><Text style={flowStyles.label}>{label}</Text><Text style={flowStyles.value}>{value}</Text></View>)}</ScrollView> : null}</Shell>;
}
export function PriceAlertsScreen() {
  const [alerts, setAlerts] = useState<MobilePriceAlert[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setAlerts((await travelApi.priceAlerts()).alerts); } catch (e) { const session = await readSession().catch(() => null); if (!session) { router.replace("/email-auth"); return; } setError(e instanceof TravelApiError ? e.message : "Unable to load alerts."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <Shell title="Price alerts"><State loading={loading} error={error} retry={() => void load()} />{!loading && !error ? <ScrollView contentContainerStyle={flowStyles.scroll}>{alerts.length ? alerts.map((alert) => <View key={alert.id} style={[styles.card, flowStyles.shadow]}><Text style={flowStyles.value}>{alert.origin ? `${alert.origin} → ` : ""}{alert.destination}</Text><Text style={flowStyles.meta}>{alert.type} · {alert.status}</Text>{alert.targetPrice ? <Text style={styles.price}>Target {alert.currency} {alert.targetPrice}</Text> : null}</View>) : <View style={styles.center}><FlowIcon name="bell" color={flowColors.blue} size={38} /><Text style={flowStyles.value}>No active price alerts</Text><Text style={flowStyles.meta}>Create an alert from a live flight or hotel search.</Text></View>}</ScrollView> : null}</Shell>;
}
const styles = StyleSheet.create({
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  center: { flex: 1, minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  row: { backgroundColor: "white", borderRadius: 12, borderColor: flowColors.border, borderWidth: 1, padding: 14, gap: 5 },
  card: { backgroundColor: "white", borderRadius: 12, borderColor: flowColors.border, borderWidth: 1, padding: 14, gap: 5 },
  price: { color: flowColors.blue, fontWeight: "800" },
});
