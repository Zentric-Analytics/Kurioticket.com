import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Bell, X } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { travelApi, TravelApiError, type CarResult, type MobilePriceAlert } from "../../api/travelApi";
import { readSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { signInHref } from "../auth/signInIntent";
import { buildCarPriceAlertPayload, carAlertPresentation, matchingCarPriceAlert } from "../flow/carPriceAlertModel";
import type { SearchPlan } from "../flow/travelSearchModel";
import { PriceAlertTargetIntent } from "./priceAlertTargetIntent";
import { Button } from "./SearchUi";

type MatchingCarAlertState = {
  planKey: string;
  alert: MobilePriceAlert;
};

export function NativeCarPriceAlert({ plan, results, available }: { plan?: SearchPlan; results: CarResult[]; available: boolean }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const presentation = useMemo(() => carAlertPresentation(plan, results), [plan?.key, results]);
  const currency = presentation.currencies[0] || "";
  const inputRef = useRef<TextInput>(null);
  const [matchingAlertState, setMatchingAlertState] = useState<MatchingCarAlertState>();
  const [reconciledPlanKey, setReconciledPlanKey] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [androidSheetReady, setAndroidSheetReady] = useState(Platform.OS !== "android");
  const pendingRef = useRef(false);
  const reconciliationRef = useRef(0);
  const targetIntentRef = useRef(new PriceAlertTargetIntent());
  const planRef = useRef(plan);
  planRef.current = plan;
  const planKey = plan?.key;
  const matchingAlert = matchingAlertState && matchingAlertState.planKey === planKey ? matchingAlertState.alert : undefined;
  const alertKnown = Boolean(planKey) && reconciledPlanKey === planKey;

  const setCurrentMatchingAlert = useCallback((alert: MobilePriceAlert | undefined) => {
    setMatchingAlertState(alert && planKey ? { planKey, alert } : undefined);
  }, [planKey]);

  const reconcile = useCallback(async () => {
    const reconciliationPlan = planRef.current;
    const reconciliationPlanKey = planKey;
    if (!reconciliationPlan || !reconciliationPlanKey) return;
    const reconciliation = ++reconciliationRef.current;
    if (reconciledPlanKey !== reconciliationPlanKey) setLoading(true);
    try {
      if (!await readSession().catch(() => null)) {
        if (reconciliation === reconciliationRef.current) {
          setCurrentMatchingAlert(undefined);
          setReconciledPlanKey(reconciliationPlanKey);
        }
        return;
      }
      const alerts = (await travelApi.priceAlerts()).alerts;
      if (reconciliation !== reconciliationRef.current) return;
      setCurrentMatchingAlert(matchingCarPriceAlert(alerts, reconciliationPlan));
      setReconciledPlanKey(reconciliationPlanKey);
    } catch (cause) {
      if (reconciliation === reconciliationRef.current && cause instanceof TravelApiError && cause.status === 401) {
        setCurrentMatchingAlert(undefined);
        setReconciledPlanKey(reconciliationPlanKey);
      }
    } finally {
      if (reconciliation === reconciliationRef.current) setLoading(false);
    }
  }, [planKey, reconciledPlanKey, setCurrentMatchingAlert]);

  useFocusEffect(useCallback(() => { void reconcile(); }, [reconcile]));

  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!open) {
      setAndroidSheetReady(false);
      return;
    }
    const show = Keyboard.addListener("keyboardDidShow", () => setAndroidSheetReady(true));
    return () => show.remove();
  }, [open]);

  const signIn = () => Alert.alert("Sign in required", "Sign in to save this price alert to your account.", [{ text: "Sign in", onPress: () => router.push(signInHref("/(tabs)/profile")) }, { text: "Cancel", style: "cancel" }]);
  const closeTargetSheet = () => {
    targetIntentRef.current.close();
    setOpen(false);
    setDraft("");
    setError("");
  };
  const openTargetSheet = async () => {
    if (pendingRef.current || !plan || !alertKnown || !available || !presentation.enabled) return;
    pendingRef.current = true;
    const intent = targetIntentRef.current.beginOpen();
    try {
      if (!await readSession().catch(() => null)) {
        if (targetIntentRef.current.isCurrent(intent)) signIn();
        return;
      }
      if (!targetIntentRef.current.isCurrent(intent)) return;
      const reusableTarget = matchingAlert?.status === "PAUSED"
        && matchingAlert.currency?.trim().toUpperCase() === currency.trim().toUpperCase()
        && Number.isFinite(Number(matchingAlert.targetPrice))
        && Number(matchingAlert.targetPrice) > 0
        ? String(matchingAlert.targetPrice)
        : "";
      setDraft(reusableTarget);
      setError("");
      if (Platform.OS === "android") setAndroidSheetReady(false);
      setOpen(true);
    } finally {
      pendingRef.current = false;
    }
  };
  const toggle = async (next: boolean) => {
    if (!plan || pendingRef.current || !alertKnown) return;
    if (next) {
      if (matchingAlert?.status === "ACTIVE") return;
      await openTargetSheet();
      return;
    }
    if (!matchingAlert || matchingAlert.status !== "ACTIVE") return;
    pendingRef.current = true;
    ++reconciliationRef.current;
    setPending(true);
    try {
      setCurrentMatchingAlert((await travelApi.updatePriceAlertStatus(matchingAlert.id, "PAUSED")).alert);
    } catch (cause) {
      if (cause instanceof TravelApiError && cause.status === 401) {
        setCurrentMatchingAlert(undefined);
        setReconciledPlanKey(planKey);
        signIn();
      } else Alert.alert("Unable to update price tracking", cause instanceof TravelApiError ? cause.message : "Please try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };
  const create = async () => {
    if (!plan || pendingRef.current) return;
    const target = Number(draft);
    if (!/^\d+(?:\.\d{1,2})?$/.test(draft.trim()) || !Number.isFinite(target) || target <= 0) {
      setError("Enter a positive target rental total.");
      return;
    }
    pendingRef.current = true;
    ++reconciliationRef.current;
    setPending(true);
    setError("");
    try {
      if (!await readSession().catch(() => null)) {
        closeTargetSheet();
        signIn();
        return;
      }
      const alerts = (await travelApi.priceAlerts()).alerts;
      const samePausedTarget = alerts.find((alert) =>
        alert.status === "PAUSED"
        && Number(alert.targetPrice) === target
        && alert.currency?.trim().toUpperCase() === currency.trim().toUpperCase()
        && matchingCarPriceAlert([alert], plan)?.id === alert.id,
      );
      const saved = samePausedTarget
        ? await travelApi.updatePriceAlertStatus(samePausedTarget.id, "ACTIVE")
        : await travelApi.createPriceAlert(buildCarPriceAlertPayload(plan, target, currency));
      setCurrentMatchingAlert(saved.alert);
      setReconciledPlanKey(planKey);
      closeTargetSheet();
    } catch (cause) {
      if (cause instanceof TravelApiError && cause.status === 409) {
        const alerts = await travelApi.priceAlerts().then(({ alerts }) => alerts).catch(() => []);
        const racedPausedTarget = alerts.find((alert) =>
          alert.status === "PAUSED"
          && Number(alert.targetPrice) === target
          && alert.currency?.trim().toUpperCase() === currency.trim().toUpperCase()
          && matchingCarPriceAlert([alert], plan)?.id === alert.id,
        );
        const canonical = racedPausedTarget
          ? (await travelApi.updatePriceAlertStatus(racedPausedTarget.id, "ACTIVE")).alert
          : matchingCarPriceAlert(alerts, plan);
        if (canonical) {
          setCurrentMatchingAlert(canonical);
          setReconciledPlanKey(planKey);
          closeTargetSheet();
        } else setError("An alert for this rental already exists.");
      } else if (cause instanceof TravelApiError && cause.status === 401) {
        setCurrentMatchingAlert(undefined);
        setReconciledPlanKey(planKey);
        closeTargetSheet();
        signIn();
      } else setError(cause instanceof TravelApiError ? cause.message : "Unable to create price alert.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  if (!presentation.visible) return null;
  const tracking = matchingAlert?.status === "ACTIVE";
  const disabled = pending || loading || !alertKnown || (!available && !tracking);
  const sheet = <SafeAreaView edges={["left", "right"]} style={Platform.OS === "android" && !androidSheetReady ? styles.androidPreparing : undefined}>
    <View style={[styles.sheet, { backgroundColor: theme.dark ? theme.background : "#F2F4F8", borderColor: theme.border, marginBottom: 12, paddingBottom: Math.max(20, insets.bottom - 12) }]}>
      <View style={styles.sheetHeader}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.sheetHeaderSlot}/>
        <Text accessibilityRole="header" style={[styles.heading, styles.sheetHeaderTitle, { color: theme.textPrimary }]}>Track rental car prices</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close price alert" disabled={pending} onPressIn={closeTargetSheet} onPress={closeTargetSheet} style={styles.sheetClose}><X accessible={false} size={22} color={theme.icon}/></Pressable>
      </View>
      <View style={styles.sheetBody}>
        <Text style={{ color: theme.textSecondary }}>Target rental total ({currency})</Text>
        <TextInput
          ref={inputRef}
          autoFocus={Platform.OS === "ios"}
          accessibilityLabel={`Target rental total in ${currency}`}
          value={draft}
          onChangeText={(value) => { setDraft(value); setError(""); }}
          keyboardType="decimal-pad"
          editable={!pending}
          style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Button label={pending ? "Creating…" : "Create alert"} onPress={() => void create()} />
      </View>
    </View>
  </SafeAreaView>;

  return <>
    <View accessibilityLabel="Track rental car prices" style={[styles.control, { backgroundColor: theme.priceAlertSurface, borderColor: theme.priceAlertBorder }]}>
      <Bell accessible={false} size={17} strokeWidth={2} color={theme.priceAlertAccent}/>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Track rental car prices</Text>
      <View style={styles.switch}>{pending ? <ActivityIndicator size="small" color={theme.priceAlertAccent}/> : null}<Switch style={Platform.OS === "ios" ? styles.iosSwitch : undefined} accessibilityRole="switch" accessibilityLabel="Track rental car prices" accessibilityState={{ checked: tracking, disabled, busy: pending }} disabled={disabled} value={tracking} onValueChange={(next) => void toggle(next)} trackColor={{ false: theme.dark ? "#465269" : "#CBD5E1", true: theme.switchTrackActive }} thumbColor="#FFFFFF" /></View>
    </View>
    {open ? <Modal
      visible
      transparent
      animationType="none"
      onShow={() => { if (Platform.OS === "android") inputRef.current?.focus(); }}
      onRequestClose={() => { if (!pending) closeTargetSheet(); }}
      accessibilityViewIsModal
    >
      <View style={styles.overlay} onAccessibilityEscape={() => { if (!pending) closeTargetSheet(); }}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]}/>
        <Pressable accessible={false} disabled={pending} onPressIn={closeTargetSheet} onPress={closeTargetSheet} style={StyleSheet.absoluteFill}/>
        <KeyboardAvoidingView style={styles.keyboardAvoider} behavior="padding" pointerEvents="box-none">
          {sheet}
        </KeyboardAvoidingView>
      </View>
    </Modal> : null}
  </>;
}

const styles = StyleSheet.create({
  control: { width: "100%", minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, flexShrink: 1, fontSize: 12.5, lineHeight: 16, fontWeight: "700", fontFamily: appFonts.bold },
  switch: { minWidth: 51, minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  iosSwitch: { transform: [{ translateY: 8 }] },
  overlay: { flex: 1, justifyContent: "flex-end" },
  scrim: { backgroundColor: "rgba(15, 23, 42, 0.35)" },
  keyboardAvoider: { flex: 1, justifyContent: "flex-end" },
  androidPreparing: { opacity: 0 },
  sheet: { marginHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, overflow: "hidden", shadowColor: "#0F172A", shadowOpacity: .2, shadowRadius: 18, elevation: 16 },
  sheetHeader: { minHeight: 68, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  sheetHeaderSlot: { width: 44, height: 44, flexShrink: 0 },
  sheetHeaderTitle: { flex: 1, minWidth: 0, textAlign: "center" },
  sheetClose: { width: 44, height: 44, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 18, lineHeight: 23, fontWeight: "700", fontFamily: appFonts.bold },
  sheetBody: { paddingHorizontal: 20, gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 18 },
  error: { color: "#A4262C" },
});
