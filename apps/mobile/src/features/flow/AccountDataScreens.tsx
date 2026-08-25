import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { travelApi, TravelApiError, type MobilePriceAlert } from "../../api/travelApi";
import { readSession } from "../../storage/sessionStorage";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";
import { useFeatureAvailability } from "../availability/FeatureAvailability";
import { FLIGHT_TRIP_TYPE_LABELS } from "./flightTripTypeLabels";
import { signInHref } from "../auth/signInIntent";
import { useAppTheme } from "../../theme/AppTheme";
import { PriceAlertIllustration } from "./PriceAlertIllustration";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return <SafeAreaView style={flowStyles.safe} edges={["top"]}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" /></Pressable><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text></View>{children}</SafeAreaView>;
}
function State({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <View style={styles.center}><ActivityIndicator color={flowColors.blue} /><Text style={flowStyles.meta}>Loading…</Text></View>;
  if (error) return <View style={styles.center}><Text accessibilityRole="alert" style={flowStyles.meta}>{error}</Text><Pressable onPress={retry} style={flowStyles.primary}><Text style={flowStyles.primaryText}>Try again</Text></Pressable></View>;
  return null;
}
export function PriceAlertsScreen() {
  const { theme } = useAppTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { availability } = useFeatureAvailability();
  const [alerts, setAlerts] = useState<MobilePriceAlert[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [pending, setPending] = useState<Record<string, boolean>>({});
  const revision = useRef(0); const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const load = useCallback(async () => { const started = revision.current; setLoading((value) => alerts.length ? value : true); setError(""); try { const incoming = (await travelApi.priceAlerts()).alerts; if (mounted.current && started === revision.current) setAlerts([...new Map(incoming.map((alert) => [alert.id, alert])).values()]); } catch (e) { if (e instanceof TravelApiError && e.status === 401 || !await readSession().catch(() => null)) { router.replace(signInHref("/price-alerts")); return; } if (mounted.current) setError(e instanceof TravelApiError ? e.message : "Unable to load alerts."); } finally { if (mounted.current) setLoading(false); } }, [alerts.length]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const mutateStatus = async (alert: MobilePriceAlert, status: "ACTIVE" | "PAUSED") => {
    if (pending[alert.id]) return; setError(""); revision.current += 1; setPending((value) => ({ ...value, [alert.id]: true })); setAlerts((value) => value.map((item) => item.id === alert.id ? { ...item, status } : item));
    try { const updated = (await travelApi.updatePriceAlertStatus(alert.id, status)).alert; if (mounted.current) setAlerts((value) => value.map((item) => item.id === alert.id ? updated : item)); }
    catch (e) { if (mounted.current) { setAlerts((value) => value.map((item) => item.id === alert.id ? alert : item)); setError(e instanceof TravelApiError ? e.message : "Unable to update alert."); } }
    finally { if (mounted.current) setPending((value) => ({ ...value, [alert.id]: false })); }
  };
  const deleteAlert = async (alert: MobilePriceAlert) => {
    if (pending[alert.id]) return; setError(""); revision.current += 1; setPending((value) => ({ ...value, [alert.id]: true })); setAlerts((value) => value.filter(({ id }) => id !== alert.id));
    try { await travelApi.deletePriceAlert(alert.id); }
    catch (e) { if (mounted.current) { setAlerts((value) => value.some(({ id }) => id === alert.id) ? value : [alert, ...value]); setError(e instanceof TravelApiError ? e.message : "Unable to delete alert."); } }
    finally { if (mounted.current) setPending((value) => ({ ...value, [alert.id]: false })); }
  };
  const confirmDelete = (alert: MobilePriceAlert) => Alert.alert("Delete price alert?", `You will stop tracking ${routeLabel(alert)} for this alert.`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void deleteAlert(alert) }]);
  const initialError = Boolean(error && !alerts.length);
  return <Shell title="Price alerts">{!availability.priceAlerts && alerts.length ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>New and reactivated price alerts are temporarily unavailable. Existing alerts remain available to pause or delete.</Text></View> : null}{loading && !alerts.length ? <State loading error="" retry={() => void load()} /> : null}{error ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.link}>Try again</Text></Pressable></View> : null}{(!loading || alerts.length) && !initialError ? <ScrollView style={!alerts.length ? { backgroundColor: theme.background } : undefined} contentContainerStyle={alerts.length ? flowStyles.scroll : styles.emptyContent}>{alerts.length ? alerts.map((alert) => { const route = routeLabel(alert); const query = alert.query || {}; return <View key={alert.id} accessibilityLabel={`${route}, ${statusLabel(alert.status)}`} style={[styles.card, flowStyles.shadow]}><Text style={flowStyles.value}>{route}</Text><Text style={flowStyles.meta}>{alert.type === "FLIGHT" ? [FLIGHT_TRIP_TYPE_LABELS[query.tripType === "one-way" ? "one-way" : "round-trip"], query.departureDate, query.returnDate, query.travelers ? `${query.travelers} travelers` : null, cabinLabel(query.cabinClass)].filter(Boolean).join(" · ") : "Hotel alert"}</Text><Text style={flowStyles.meta}>{statusLabel(alert.status)}</Text>{alert.targetPrice && alert.currency ? <Text style={styles.price}>Target {alert.currency} {alert.targetPrice}</Text> : null}{alert.lastSeenPrice && alert.currency ? <Text style={flowStyles.meta}>Last seen {alert.currency} {alert.lastSeenPrice}</Text> : null}{alert.lastCheckedAt ? <Text style={flowStyles.meta}>Last checked {new Date(alert.lastCheckedAt).toLocaleString()}</Text> : null}<View style={styles.actions}>{alert.status === "ACTIVE" ? <Pressable accessibilityRole="button" accessibilityLabel={`Pause ${route}`} disabled={pending[alert.id]} onPress={() => void mutateStatus(alert, "PAUSED")} style={styles.action}><Text style={styles.link}>Pause</Text></Pressable> : null}{alert.status === "PAUSED" && availability.priceAlerts ? <Pressable accessibilityRole="button" accessibilityLabel={`Reactivate ${route}`} disabled={pending[alert.id]} onPress={() => void mutateStatus(alert, "ACTIVE")} style={styles.action}><Text style={styles.link}>Reactivate</Text></Pressable> : null}<Pressable accessibilityRole="button" accessibilityLabel={`Delete ${route}`} disabled={pending[alert.id]} onPress={() => confirmDelete(alert)} style={styles.delete}><Text style={styles.deleteText}>Delete</Text></Pressable></View></View>; }) : <><View style={styles.emptyTopSpacer} /><View testID="price-alert-illustration" style={[styles.illustration, { width: Math.min(220, windowWidth - 72), height: Math.min(198, (windowWidth - 72) * .9) }]}><PriceAlertIllustration border={theme.border} surface={theme.surface} muted={theme.muted} /></View><View style={[styles.illustrationGap, windowHeight < 760 && styles.illustrationGapShort]} /><Text style={[styles.emptyTitle, { color: theme.text }]}>{availability.priceAlerts ? "Track prices for your trip" : "Price alerts are temporarily unavailable"}</Text><Text style={[styles.emptyText, { color: theme.muted }]}>{availability.priceAlerts ? "Create a price alert from a flight search and we’ll help you keep an eye on fare changes." : "New price alerts can’t be created right now. Please try again later."}</Text>{availability.priceAlerts ? <Pressable accessibilityRole="button" accessibilityLabel="Search flights" onPress={() => router.dismissTo("/(tabs)")} style={({ pressed }) => [styles.emptyPrimary, pressed && styles.pressed]}><Text style={styles.emptyPrimaryText}>Search flights</Text></Pressable> : null}<View style={styles.emptyBottomSpacer} /></>}</ScrollView> : null}</Shell>;
}
function routeLabel(alert: MobilePriceAlert) { return alert.origin ? `${alert.origin} → ${alert.destination}` : alert.destination; }
function statusLabel(status: MobilePriceAlert["status"]) { return ({ ACTIVE: "Active", PAUSED: "Paused", TRIGGERED: "Triggered", EXPIRED: "Expired" } as const)[status]; }
function cabinLabel(value: unknown) { return typeof value === "string" ? value.split("-").map((word) => `${word[0]?.toUpperCase() || ""}${word.slice(1)}`).join(" ") : null; }
const styles = StyleSheet.create({
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  center: { flex: 1, minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  row: { backgroundColor: "white", borderRadius: 12, borderColor: flowColors.border, borderWidth: 1, padding: 14, gap: 5 },
  card: { backgroundColor: "white", borderRadius: 12, borderColor: flowColors.border, borderWidth: 1, padding: 14, gap: 5 },
  price: { color: flowColors.blue, fontWeight: "800" },
  feedback: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", gap: 8 }, error: { color: "#A4262C", flex: 1 }, link: { color: flowColors.blue, fontWeight: "800" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }, action: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: flowColors.blue, borderRadius: 8, paddingHorizontal: 16 }, delete: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: "#A4262C", borderRadius: 8, paddingHorizontal: 16 }, deleteText: { color: "#A4262C", fontWeight: "800" },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginTop: 5 }, multiline: { minHeight: 92, textAlignVertical: "top", paddingTop: 12 }, success: { color: "#16885B", fontWeight: "700" },
  emptyContent: { flexGrow: 1, alignItems: "center", paddingHorizontal: 24 }, emptyTopSpacer: { flexGrow: .72, minHeight: 28 }, illustration: { alignSelf: "center" }, illustrationGap: { height: 66 }, illustrationGapShort: { height: 55 }, emptyTitle: { maxWidth: 330, fontSize: 23, lineHeight: 30, fontWeight: "800", textAlign: "center" }, emptyText: { width: "86%", maxWidth: 380, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 14 }, emptyPrimary: { width: 208, minHeight: 50, marginTop: 31, borderRadius: 10, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", backgroundColor: flowColors.blue }, emptyPrimaryText: { color: flowColors.white, fontSize: 15, fontWeight: "800" }, emptyBottomSpacer: { flexGrow: 1, minHeight: 24 }, pressed: { opacity: .68 },
});
