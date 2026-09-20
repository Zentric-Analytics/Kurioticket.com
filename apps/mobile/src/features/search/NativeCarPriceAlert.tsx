import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Bell } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { travelApi, TravelApiError, type CarResult, type MobilePriceAlert } from "../../api/travelApi";
import { readSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { signInHref } from "../auth/signInIntent";
import { buildAutomaticCarPriceAlertPayload, carAlertPresentation, matchingCarPriceAlert } from "../flow/carPriceAlertModel";
import type { SearchPlan } from "../flow/travelSearchModel";

export const CAR_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600;
export type CarPriceAlertFeedback = "active" | "paused" | null;
type MatchingCarAlertState = { planKey: string; alert: MobilePriceAlert };

export function NativeCarPriceAlert({ plan, results, available, onFeedback }: { plan?: SearchPlan; results: CarResult[]; available: boolean; onFeedback?: (feedback: CarPriceAlertFeedback) => void }) {
  const { theme } = useAppTheme();
  const presentation = useMemo(() => carAlertPresentation(plan, results), [plan?.key, results]);
  const [matchingAlertState, setMatchingAlertState] = useState<MatchingCarAlertState>();
  const [reconciledPlanKey, setReconciledPlanKey] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const reconciliationRef = useRef(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const planRef = useRef(plan);
  planRef.current = plan;
  const planKey = plan?.key;
  const matchingAlert = matchingAlertState && matchingAlertState.planKey === planKey ? matchingAlertState.alert : undefined;
  const alertKnown = Boolean(planKey) && reconciledPlanKey === planKey;

  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); onFeedback?.(null); }, [onFeedback]);
  const showFeedback = useCallback((feedback: Exclude<CarPriceAlertFeedback, null>) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    onFeedback?.(feedback);
    feedbackTimer.current = setTimeout(() => onFeedback?.(null), CAR_PRICE_ALERT_SNACKBAR_DURATION_MS);
  }, [onFeedback]);
  const setCurrentMatchingAlert = useCallback((alert: MobilePriceAlert | undefined) => setMatchingAlertState(alert && planKey ? { planKey, alert } : undefined), [planKey]);
  const signIn = () => Alert.alert("Sign in required", "Sign in to save this price alert to your account.", [{ text: "Sign in", onPress: () => router.push(signInHref("/(tabs)/profile")) }, { text: "Cancel", style: "cancel" }]);

  const reconcile = useCallback(async () => {
    const reconciliationPlan = planRef.current;
    const reconciliationPlanKey = planKey;
    if (!reconciliationPlan || !reconciliationPlanKey) return;
    const reconciliation = ++reconciliationRef.current;
    if (reconciledPlanKey !== reconciliationPlanKey) setLoading(true);
    try {
      if (!await readSession().catch(() => null)) {
        if (reconciliation === reconciliationRef.current) { setCurrentMatchingAlert(undefined); setReconciledPlanKey(reconciliationPlanKey); }
        return;
      }
      const alerts = (await travelApi.priceAlerts()).alerts;
      if (reconciliation !== reconciliationRef.current) return;
      setCurrentMatchingAlert(matchingCarPriceAlert(alerts, reconciliationPlan));
      setReconciledPlanKey(reconciliationPlanKey);
    } catch (cause) {
      if (reconciliation === reconciliationRef.current && cause instanceof TravelApiError && cause.status === 401) { setCurrentMatchingAlert(undefined); setReconciledPlanKey(reconciliationPlanKey); }
    } finally { if (reconciliation === reconciliationRef.current) setLoading(false); }
  }, [planKey, reconciledPlanKey, setCurrentMatchingAlert]);
  useFocusEffect(useCallback(() => { void reconcile(); }, [reconcile]));

  const toggle = async (next: boolean) => {
    if (!plan || pendingRef.current || !alertKnown || (!available && next)) return;
    if (next && matchingAlert?.status === "ACTIVE") return;
    if (!next && matchingAlert?.status !== "ACTIVE") return;
    pendingRef.current = true;
    ++reconciliationRef.current;
    setPending(true);
    try {
      if (next && !await readSession().catch(() => null)) { signIn(); return; }
      let saved: MobilePriceAlert;
      if (next && matchingAlert?.status === "PAUSED") {
        saved = (await travelApi.updatePriceAlertStatus(matchingAlert.id, "ACTIVE")).alert;
      } else if (next) {
        const baseline = presentation.baselineOffer;
        if (!baseline) throw new Error("missing_baseline");
        saved = (await travelApi.createPriceAlert(buildAutomaticCarPriceAlertPayload(plan, baseline.totalPrice, baseline.currency))).alert;
      } else {
        saved = (await travelApi.updatePriceAlertStatus(matchingAlert!.id, "PAUSED")).alert;
      }
      setCurrentMatchingAlert(saved);
      setReconciledPlanKey(planKey);
      showFeedback(next ? "active" : "paused");
    } catch (cause) {
      if (next && cause instanceof TravelApiError && cause.status === 409) {
        const alerts = await travelApi.priceAlerts().then(({ alerts }) => alerts).catch(() => []);
        const canonical = matchingCarPriceAlert(alerts, plan);
        if (canonical) {
          const saved = canonical.status === "PAUSED" ? (await travelApi.updatePriceAlertStatus(canonical.id, "ACTIVE")).alert : canonical;
          setCurrentMatchingAlert(saved); setReconciledPlanKey(planKey); showFeedback("active");
        } else Alert.alert("Couldn't start price tracking. Try again.");
      } else if (cause instanceof TravelApiError && cause.status === 401) {
        setCurrentMatchingAlert(undefined); setReconciledPlanKey(planKey); signIn();
      } else Alert.alert(next ? "Couldn't start price tracking. Try again." : "Couldn't pause price tracking. Try again.");
    } finally { pendingRef.current = false; setPending(false); }
  };

  if (!presentation.visible) return null;
  const tracking = matchingAlert?.status === "ACTIVE";
  const disabled = pending || loading || !alertKnown || (!available && !tracking);
  return <View accessibilityLabel="Track rental car prices" style={[styles.control, { backgroundColor: theme.priceAlertSurface, borderColor: theme.priceAlertBorder }]}>
    <Bell accessible={false} size={17} strokeWidth={2} color={theme.priceAlertAccent}/>
    <Text style={[styles.title, { color: theme.textPrimary }]}>Track rental car prices</Text>
    <View style={styles.switch}>{pending ? <ActivityIndicator size="small" color={theme.priceAlertAccent}/> : null}<Switch accessibilityRole="switch" accessibilityLabel="Track rental car prices" accessibilityState={{ checked: tracking, disabled, busy: pending }} disabled={disabled} value={tracking} onValueChange={(next) => void toggle(next)} trackColor={{ false: theme.dark ? "#465269" : "#CBD5E1", true: theme.switchTrackActive }} thumbColor="#FFFFFF" /></View>
  </View>;
}

export function CarPriceAlertSnackbar({ feedback }: { feedback: Exclude<CarPriceAlertFeedback, null> }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.parallel([Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }), Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true })]).start(); }, [opacity, translateY]);
  const active = feedback === "active";
  return <Animated.View accessibilityLiveRegion="polite" style={[styles.snackbarPosition, { bottom: Math.max(insets.bottom, 12) + 12, opacity, transform: [{ translateY }] }]}>
    <View style={[styles.snackbar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Bell accessible={false} size={20} color={theme.priceAlertAccent}/>
      <View style={styles.snackbarCopy}><Text style={[styles.snackbarTitle, { color: theme.textPrimary }]}>{active ? "Price tracking is on" : "Price tracking paused"}</Text>{active ? <Text style={[styles.snackbarBody, { color: theme.textSecondary }]}>We'll let you know when this rental gets cheaper.</Text> : null}</View>
      {active ? <Pressable accessibilityRole="button" accessibilityLabel="Manage price alerts" onPress={() => router.push("/price-alerts")} style={styles.manage}><Text style={[styles.manageText, { color: theme.priceAlertAccent }]}>Manage</Text></Pressable> : null}
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  control: { width: "100%", minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, flexShrink: 1, fontSize: 12.5, lineHeight: 16, fontWeight: "700", fontFamily: appFonts.bold },
  switch: { minWidth: 51, minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  snackbarPosition: { position: "absolute", left: 16, right: 16, zIndex: 50 },
  snackbar: { minHeight: 78, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 11, shadowColor: "#0F172A", shadowOpacity: 0.2, shadowRadius: 14, elevation: 12 },
  snackbarCopy: { flex: 1, minWidth: 0, gap: 2 },
  snackbarTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800", fontFamily: appFonts.bold },
  snackbarBody: { fontSize: 13, lineHeight: 18 },
  manage: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  manageText: { fontSize: 14, fontWeight: "800", fontFamily: appFonts.bold },
});
