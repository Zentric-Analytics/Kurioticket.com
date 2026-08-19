import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { travelApi, TravelApiError, type MobilePriceAlert, type MobileProfile } from "../../api/travelApi";
import { readSession, updateStoredSessionName } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";
import { useFeatureAvailability } from "../availability/FeatureAvailability";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return <SafeAreaView style={flowStyles.safe} edges={["top"]}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" /></Pressable><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text></View>{children}</SafeAreaView>;
}
function State({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <View style={styles.center}><ActivityIndicator color={flowColors.blue} /><Text style={flowStyles.meta}>Loading…</Text></View>;
  if (error) return <View style={styles.center}><Text accessibilityRole="alert" style={flowStyles.meta}>{error}</Text><Pressable onPress={retry} style={flowStyles.primary}><Text style={flowStyles.primaryText}>Try again</Text></Pressable></View>;
  return null;
}
export function PersonalInformationScreen() {
  const { theme } = useAppTheme();
  const [profile, setProfile] = useState<MobileProfile>({}); const [email, setEmail] = useState(""); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const data = await travelApi.profile(); setProfile(data.profile || {}); setEmail(data.user.email); } catch (e) { const session = await readSession().catch(() => null); if (!session) { router.replace({ pathname: "/(tabs)/profile/sign-in", params: { returnTo: "/personal-information" } }); return; } setError(e instanceof TravelApiError ? e.message : "Unable to load profile."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const change = (key: keyof MobileProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const save = async () => { if (saving) return; setSaving(true); setError(""); setSuccess(""); try { const result = await travelApi.updateProfile(profile); setProfile(result.profile); await updateStoredSessionName(result.profile.fullName || null); setSuccess("Personal information saved."); } catch (e) { setError(e instanceof TravelApiError ? e.message : "Unable to save profile."); } finally { setSaving(false); } };
  const fields: [keyof MobileProfile, string, string?][] = [["fullName", "Full name"], ["phoneCountryCode", "Phone country code", "US"], ["phoneNumber", "Phone number"], ["dateOfBirth", "Date of birth", "YYYY-MM-DD"], ["gender", "Gender"], ["nationality", "Nationality"], ["address", "Address"]];
  return <Shell title="Personal information"><State loading={loading} error={loading ? error : ""} retry={() => void load()} />{!loading ? <ScrollView contentContainerStyle={flowStyles.scroll}>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{success ? <Text accessibilityRole="alert" style={styles.success}>{success}</Text> : null}<Text style={[flowStyles.label, { color: theme.muted }]}>Email</Text><TextInput accessibilityLabel="Email, read only" editable={false} value={email} style={[styles.input, { color: theme.muted, backgroundColor: theme.surface, borderColor: theme.border }]} /><Pressable accessibilityRole="link" accessibilityLabel="Change email on web, opens website" onPress={() => void Linking.openURL("https://kurioticket.com/dashboard").catch(() => setError("Unable to open personal details."))}><Text style={styles.link}>Change email on web</Text></Pressable>{fields.map(([key, label, placeholder]) => <View key={key}><Text style={[flowStyles.label, { color: theme.muted }]}>{label}</Text><TextInput accessibilityLabel={label} value={profile[key] || ""} placeholder={placeholder} placeholderTextColor={theme.muted} onChangeText={(value) => change(key, value)} multiline={key === "address"} style={[styles.input, key === "address" && styles.multiline, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]} /></View>)}<Pressable accessibilityRole="button" accessibilityState={{ busy: saving, disabled: saving }} disabled={saving} onPress={() => void save()} style={flowStyles.primary}><Text style={flowStyles.primaryText}>{saving ? "Saving…" : "Save changes"}</Text></Pressable></ScrollView> : null}</Shell>;
}
export function PriceAlertsScreen() {
  const { availability } = useFeatureAvailability();
  const [alerts, setAlerts] = useState<MobilePriceAlert[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [pending, setPending] = useState<Record<string, boolean>>({});
  const revision = useRef(0); const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const load = useCallback(async () => { const started = revision.current; setLoading((value) => alerts.length ? value : true); setError(""); try { const incoming = (await travelApi.priceAlerts()).alerts; if (mounted.current && started === revision.current) setAlerts([...new Map(incoming.map((alert) => [alert.id, alert])).values()]); } catch (e) { if (e instanceof TravelApiError && e.status === 401 || !await readSession().catch(() => null)) { router.replace({ pathname: "/(tabs)/profile/sign-in", params: { returnTo: "/price-alerts" } }); return; } if (mounted.current) setError(e instanceof TravelApiError ? e.message : "Unable to load alerts."); } finally { if (mounted.current) setLoading(false); } }, [alerts.length]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const mutateStatus = async (alert: MobilePriceAlert, status: "ACTIVE" | "PAUSED") => {
    if (pending[alert.id]) return; revision.current += 1; setPending((value) => ({ ...value, [alert.id]: true })); setAlerts((value) => value.map((item) => item.id === alert.id ? { ...item, status } : item));
    try { const updated = (await travelApi.updatePriceAlertStatus(alert.id, status)).alert; if (mounted.current) setAlerts((value) => value.map((item) => item.id === alert.id ? updated : item)); }
    catch (e) { if (mounted.current) { setAlerts((value) => value.map((item) => item.id === alert.id ? alert : item)); setError(e instanceof TravelApiError ? e.message : "Unable to update alert."); } }
    finally { if (mounted.current) setPending((value) => ({ ...value, [alert.id]: false })); }
  };
  const deleteAlert = async (alert: MobilePriceAlert) => {
    if (pending[alert.id]) return; revision.current += 1; setPending((value) => ({ ...value, [alert.id]: true })); setAlerts((value) => value.filter(({ id }) => id !== alert.id));
    try { await travelApi.deletePriceAlert(alert.id); }
    catch (e) { if (mounted.current) { setAlerts((value) => value.some(({ id }) => id === alert.id) ? value : [alert, ...value]); setError(e instanceof TravelApiError ? e.message : "Unable to delete alert."); } }
    finally { if (mounted.current) setPending((value) => ({ ...value, [alert.id]: false })); }
  };
  const confirmDelete = (alert: MobilePriceAlert) => Alert.alert("Delete price alert?", `You will stop tracking ${routeLabel(alert)} for this alert.`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void deleteAlert(alert) }]);
  return <Shell title="Price alerts">{!availability.priceAlerts ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>New and reactivated price alerts are temporarily unavailable. Existing alerts remain available to pause or delete.</Text></View> : null}{loading && !alerts.length ? <State loading error="" retry={() => void load()} /> : null}{error ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.link}>Try again</Text></Pressable></View> : null}{!loading || alerts.length ? <ScrollView contentContainerStyle={flowStyles.scroll}>{alerts.length ? alerts.map((alert) => { const route = routeLabel(alert); const query = alert.query || {}; return <View key={alert.id} accessibilityLabel={`${route}, ${statusLabel(alert.status)}`} style={[styles.card, flowStyles.shadow]}><Text style={flowStyles.value}>{route}</Text><Text style={flowStyles.meta}>{alert.type === "FLIGHT" ? [query.tripType === "one-way" ? "One way" : "Round trip", query.departureDate, query.returnDate, query.travelers ? `${query.travelers} travelers` : null, cabinLabel(query.cabinClass)].filter(Boolean).join(" · ") : "Hotel alert"}</Text><Text style={flowStyles.meta}>{statusLabel(alert.status)}</Text>{alert.targetPrice && alert.currency ? <Text style={styles.price}>Target {alert.currency} {alert.targetPrice}</Text> : null}{alert.lastSeenPrice && alert.currency ? <Text style={flowStyles.meta}>Last seen {alert.currency} {alert.lastSeenPrice}</Text> : null}{alert.lastCheckedAt ? <Text style={flowStyles.meta}>Last checked {new Date(alert.lastCheckedAt).toLocaleString()}</Text> : null}<View style={styles.actions}>{alert.status === "ACTIVE" ? <Pressable accessibilityRole="button" accessibilityLabel={`Pause ${route}`} disabled={pending[alert.id]} onPress={() => void mutateStatus(alert, "PAUSED")} style={styles.action}><Text style={styles.link}>Pause</Text></Pressable> : null}{alert.status === "PAUSED" && availability.priceAlerts ? <Pressable accessibilityRole="button" accessibilityLabel={`Reactivate ${route}`} disabled={pending[alert.id]} onPress={() => void mutateStatus(alert, "ACTIVE")} style={styles.action}><Text style={styles.link}>Reactivate</Text></Pressable> : null}<Pressable accessibilityRole="button" accessibilityLabel={`Delete ${route}`} disabled={pending[alert.id]} onPress={() => confirmDelete(alert)} style={styles.delete}><Text style={styles.deleteText}>Delete</Text></Pressable></View></View>; }) : <View style={styles.center}><FlowIcon name="bell" color={flowColors.blue} size={38} /><Text style={flowStyles.value}>No price alerts</Text><Text style={flowStyles.meta}>Create a price alert from a valid live flight search.</Text></View>}</ScrollView> : null}</Shell>;
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
});
