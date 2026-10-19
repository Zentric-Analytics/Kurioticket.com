import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, I18nManager, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Bell, CircleCheck } from "lucide-react-native";
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
  const [optimisticTracking, setOptimisticTracking] = useState<boolean | null>(null);
  const pendingRef = useRef(false);
  const reconciliationRef = useRef(0);
  const planRef = useRef(plan);
  planRef.current = plan;
  const planKey = plan?.key;
  const matchingAlert = matchingAlertState && matchingAlertState.planKey === planKey ? matchingAlertState.alert : undefined;
  const alertKnown = Boolean(planKey) && reconciledPlanKey === planKey;

  const showFeedback = useCallback((feedback: Exclude<CarPriceAlertFeedback, null>) => {
    onFeedback?.(feedback);
  }, [onFeedback]);
  const setCurrentMatchingAlert = useCallback((alert: MobilePriceAlert | undefined) => setMatchingAlertState(alert && planKey ? { planKey, alert } : undefined), [planKey]);
  const signIn = () => Alert.alert("Sign in required", "Sign in to save this price alert to your account.", [{ text: "Sign in", onPress: () => router.push(signInHref("/(tabs)/profile")) }, { text: "Cancel", style: "cancel" }]);
  const showFailure = (next: boolean) => Alert.alert(
    next ? "Couldn’t turn on price tracking" : "Couldn’t turn off price tracking",
    next ? "There was a problem starting price tracking. Check your connection and try again." : "There was a problem turning off price tracking. Check your connection and try again.",
    [{ text: "Cancel", style: "cancel" }, { text: "Try again", onPress: () => void toggle(next) }],
  );

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
    setOptimisticTracking(next);
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
        } else showFailure(true);
      } else if (cause instanceof TravelApiError && cause.status === 401) {
        setCurrentMatchingAlert(undefined); setReconciledPlanKey(planKey); signIn();
      } else showFailure(next);
    } finally { pendingRef.current = false; setPending(false); setOptimisticTracking(null); }
  };

  const committedTracking = matchingAlert?.status === "ACTIVE";
  const tracking = optimisticTracking ?? committedTracking;
  const disabled = loading || !alertKnown || (!available && !tracking);
  const switchAnimation = useRef(new Animated.Value(tracking ? 1 : 0)).current;
  useEffect(() => {
    const motion = Animated.timing(switchAnimation, {
      toValue: tracking ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    motion.start();
    return () => motion.stop();
  }, [switchAnimation, tracking]);
  const thumbTranslateX = switchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, I18nManager.isRTL ? -20 : 20],
  });
  if (!presentation.visible) return null;
  return <View style={styles.control}>
    <Bell accessible={false} size={16} strokeWidth={2} color={theme.priceAlertAccent}/>
    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.title, { color: theme.dark ? theme.textPrimary : "#07133B" }]}>Track car prices</Text>
    <View style={styles.switchSlot}>
      <Pressable accessibilityRole="switch" accessibilityLabel="Track car prices" accessibilityState={{ checked: tracking, disabled, busy: pending }} disabled={disabled} onPress={() => void toggle(!tracking)} style={styles.switchTouchTarget}>
        <View pointerEvents="none" style={[styles.switchTrack, { backgroundColor: tracking ? theme.switchTrackActive : theme.dark ? "#465269" : "#CBD5E1", borderColor: tracking ? theme.switchTrackActive : theme.dark ? "#465269" : "#CBD5E1" }]}>
          <Animated.View style={[styles.switchThumb, I18nManager.isRTL && !I18nManager.doLeftAndRightSwapInRTL ? styles.switchThumbRtl : styles.switchThumbLtr, { transform: [{ translateX: thumbTranslateX }] }]}/>
        </View>
      </Pressable>
    </View>
  </View>;
}

export function CarPriceAlertSnackbar({ feedback, onDismiss }: { feedback: Exclude<CarPriceAlertFeedback, null>; onDismiss: (feedback: Exclude<CarPriceAlertFeedback, null>) => void }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(10)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    enter.start();
    const dismissTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 8, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) onDismiss(feedback); });
    }, CAR_PRICE_ALERT_SNACKBAR_DURATION_MS);
    return () => { clearTimeout(dismissTimer); enter.stop(); translateY.stopAnimation(); opacity.stopAnimation(); };
  }, [feedback, onDismiss, opacity, translateY]);
  const active = feedback === "active";
  return <Animated.View accessibilityLiveRegion="polite" style={[styles.snackbarPosition, { bottom: Math.max(insets.bottom, 12) + 12, opacity, transform: [{ translateY }] }]}>
    <View style={[styles.snackbar, { backgroundColor: theme.priceAlertSurface, borderColor: theme.priceAlertBorder }]}>
      <CircleCheck accessible={false} size={20} strokeWidth={2.2} color={theme.priceAlertAccent}/>
      <View style={styles.snackbarCopy}><Text style={[styles.snackbarTitle, { color: theme.textPrimary }]}>{active ? "Price tracking is on" : "Price tracking is off"}</Text><Text style={[styles.snackbarBody, { color: theme.textSecondary }]}>{active ? "We'll notify you if the price drops." : "You’ll no longer receive price-drop alerts for this rental."}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Manage price alerts" onPress={() => router.push("/price-alerts")} style={styles.manage}><Text style={[styles.manageText, { color: theme.priceAlertAccent }]}>Manage</Text></Pressable>
    </View>
  </Animated.View>;
}

export const PriceTrackingSnackbar = CarPriceAlertSnackbar;

const styles = StyleSheet.create({
  control: { flexShrink: 1, minWidth: 0, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  title: { minWidth: 0, flexShrink: 1, fontSize: 12, lineHeight: 17, fontWeight: "600", fontFamily: appFonts.semibold },
  switchSlot: { width: 51, height: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  switchTouchTarget: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  switchTrack: { width: 44, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
  switchThumb: { position: "absolute", top: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF", shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  switchThumbLtr: { left: 3 },
  switchThumbRtl: { right: 3 },
  snackbarPosition: { position: "absolute", left: 16, right: 16, zIndex: 50 },
  snackbar: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 12, elevation: 10 },
  snackbarCopy: { flex: 1, minWidth: 0, gap: 1 },
  snackbarTitle: { fontSize: 14, lineHeight: 19, fontWeight: "700", fontFamily: appFonts.bold },
  snackbarBody: { fontSize: 12.5, lineHeight: 17 },
  manage: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  manageText: { fontSize: 13.5, fontWeight: "700", fontFamily: appFonts.bold },
});
