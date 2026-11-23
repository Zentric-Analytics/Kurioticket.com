import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Bell, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  travelApi,
  TravelApiError,
  type HotelResult,
  type FlightResult,
  type MobilePriceAlert,
} from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { travelAccountMessage } from "../../localization/travelAccountMessages";
import { readSession } from "../../storage/sessionStorage";
import { useFlightResultsTheme as useAppTheme, useFlightResultsUi } from "./FlightResultsPresentationContext";
import { appFonts } from "../../theme/typography";
import { signInHref } from "../auth/signInIntent";
import { displayPrice, formatMarketCurrency, type ExchangeRates } from "../currency/displayCurrency";
import {
  buildHotelPriceAlertPayload,
  matchingHotelPriceAlert,
  type HotelAlertProperty,
} from "../flow/hotelPriceAlertModel";
import { buildFlightPriceAlertPayload, flightPriceAlertMatchesPlan, matchingFlightPriceAlert, pauseActiveFlightPriceAlerts, selectAutomaticFlightBaseline } from "../flow/flightPriceAlertModel";
import type { SearchPlan } from "../flow/travelSearchModel";
import { FlightRangeSlider } from "./FlightRangeSlider";
import { PriceAlertTargetIntent } from "./priceAlertTargetIntent";
import {
  HOTEL_ALERT_DEFAULT_DROP_PERCENT,
  HOTEL_ALERT_MAX_DROP_PERCENT,
  HOTEL_ALERT_MIN_DROP_PERCENT,
  hotelAlertDesiredTotal,
  hotelAlertDropPercentForTarget,
  hotelAlertPriceBasis,
} from "./hotelPriceAlertSliderModel";
import { ui as sharedUi } from "./SearchUi";
const ui = sharedUi;

type Props = {
  plan: SearchPlan;
  hotelResults: HotelResult[];
  hotel?: HotelAlertProperty;
  available?: boolean;
  displayCurrency: string;
  rates: ExchangeRates;
  product?: "hotel" | "flight";
  flightResults?: FlightResult[];
  onFeedback?: (feedback: "active" | "paused") => void;
};

type PreservedPausedTarget = {
  id: string;
  target: number;
  currency: string;
};

function formatDropPercent(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function HotelPriceAlert({
  plan,
  hotelResults,
  hotel,
  available = true,
  displayCurrency,
  rates,
  product = "hotel",
  flightResults = [],
  onFeedback,
}: Props) {
  const flight = product === "flight";
  const hotelId = flight ? undefined : hotel?.id;
  const { theme } = useAppTheme();
  const ui = useFlightResultsUi(sharedUi);
  const insets = useSafeAreaInsets();
  const { locale, t } = useMobileLocalization();
  const message = useCallback(
    (key: Parameters<typeof travelAccountMessage>[1]) => travelAccountMessage(locale, key),
    [locale],
  );
  const alertTitle = flight ? "Track this flight price" : message("hotelAlertTitle");
  const alertBody = flight ? "Choose a target and we’ll notify you if the price drops." : message("hotelAlertBody");
  const currentLabel = flight ? "Current price" : message("currentTotal");
  const targetLabel = flight ? "Target price" : message("targetTotal");
  const saveLabel = flight ? "Save price alert" : message("createAlert");
  const matchAlert = useCallback((alerts: MobilePriceAlert[], search: SearchPlan) => flight
    ? matchingFlightPriceAlert(alerts, search)
    : matchingHotelPriceAlert(alerts, search, hotelId), [flight, hotelId]);
  const [matchingAlertState, setMatchingAlertState] = useState<{ planKey: string; alert: MobilePriceAlert }>();
  const [reconciledPlanKey, setReconciledPlanKey] = useState<string>();
  const [loadingAlert, setLoadingAlert] = useState(true);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dropPercent, setDropPercent] = useState(HOTEL_ALERT_DEFAULT_DROP_PERCENT);
  const [preservedPausedTarget, setPreservedPausedTarget] = useState<PreservedPausedTarget | null>(null);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);
  const reconciliationRef = useRef(0);
  const targetIntentRef = useRef(new PriceAlertTargetIntent());
  const planKey = hotelId ? JSON.stringify([plan.key, hotelId]) : plan.key;
  const planRef = useRef(plan);
  planRef.current = { ...plan, key: planKey };
  useEffect(() => {
    targetIntentRef.current.close();
    setSheetOpen(false);
    setPreservedPausedTarget(null);
    setError("");
  }, [planKey]);

  const matchingAlert = matchingAlertState?.planKey === planKey ? matchingAlertState.alert : undefined;
  const isTracking = matchingAlert?.status === "ACTIVE";
  const alertKnown = reconciledPlanKey === planKey;
  const priceBasis = useMemo(
    () => {
      if (!flight) return hotelAlertPriceBasis(hotelResults, displayCurrency, rates);
      const baseline = selectAutomaticFlightBaseline(flightResults, plan.payload.currency);
      if (!baseline) return null;
      const visible = displayPrice(baseline.price, baseline.currency, displayCurrency, rates);
      return { amount: visible.amount, currency: visible.currency, providerAmount: baseline.price, providerCurrency: baseline.currency };
    },
    [flight, flightResults, plan.payload.currency, displayCurrency, hotelResults, rates],
  );
  const currentTotal = priceBasis?.amount ?? null;
  const visibleCurrency = priceBasis?.currency ?? displayCurrency.trim().toUpperCase();
  const providerCurrentTotal = priceBasis?.providerAmount ?? null;
  const alertCurrency = priceBasis?.providerCurrency ?? null;
  const sliderAlertTarget = providerCurrentTotal === null || alertCurrency === null
    ? null
    : hotelAlertDesiredTotal(providerCurrentTotal, dropPercent, alertCurrency);
  const alertTarget = preservedPausedTarget?.currency === alertCurrency
    ? preservedPausedTarget.target
    : sliderAlertTarget;
  const sliderDisplayTarget = currentTotal === null
    ? null
    : hotelAlertDesiredTotal(currentTotal, dropPercent, visibleCurrency);
  const preservedDisplayTarget = preservedPausedTarget && alertCurrency && visibleCurrency
    ? displayPrice(preservedPausedTarget.target, alertCurrency, visibleCurrency, rates).amount
    : null;
  const desiredTotal = preservedPausedTarget?.currency === alertCurrency
    ? preservedDisplayTarget
    : sliderDisplayTarget;
  const readyToCreate = Boolean(
    available
    && currentTotal !== null
    && providerCurrentTotal !== null
    && alertTarget !== null
    && alertCurrency
    && !pending,
  );

  const setCurrentMatchingAlert = useCallback((alert: MobilePriceAlert | undefined) => {
    setMatchingAlertState(alert ? { planKey, alert } : undefined);
  }, [planKey]);

  const closeSheet = useCallback(() => {
    targetIntentRef.current.close();
    setSheetOpen(false);
    setPreservedPausedTarget(null);
    setError("");
  }, []);

  const requireSignIn = useCallback(() => {
    Alert.alert(
      message("signInRequired"),
      message("signInAlertBody"),
      [
        { text: t("signIn"), onPress: () => router.push(signInHref("/(tabs)/profile")) },
        { text: t("cancel"), style: "cancel" },
      ],
    );
  }, [message, t]);

  const reconcile = useCallback(async () => {
    const reconciliationPlan = planRef.current;
    const reconciliationPlanKey = planKey;
    const reconciliation = ++reconciliationRef.current;
    setLoadingAlert(true);
    try {
      const session = await readSession().catch(() => null);
      if (!session) {
        if (reconciliation === reconciliationRef.current && planRef.current.key === reconciliationPlanKey) {
          setCurrentMatchingAlert(undefined);
          setReconciledPlanKey(reconciliationPlanKey);
        }
        return;
      }
      const alerts = (await travelApi.priceAlerts()).alerts;
      if (reconciliation !== reconciliationRef.current || planRef.current.key !== reconciliationPlanKey) return;
      setCurrentMatchingAlert(matchAlert(alerts, reconciliationPlan));
      setReconciledPlanKey(reconciliationPlanKey);
    } catch (cause) {
      if (reconciliation === reconciliationRef.current && planRef.current.key === reconciliationPlanKey && cause instanceof TravelApiError && cause.status === 401) {
        setCurrentMatchingAlert(undefined);
        setReconciledPlanKey(reconciliationPlanKey);
      }
    } finally {
      if (reconciliation === reconciliationRef.current && planRef.current.key === reconciliationPlanKey) setLoadingAlert(false);
    }
  }, [matchAlert, planKey, setCurrentMatchingAlert]);

  useFocusEffect(useCallback(() => {
    void reconcile();
  }, [reconcile]));

  const openSheet = async () => {
    if (pendingRef.current || !alertKnown || !available || currentTotal === null || providerCurrentTotal === null || !alertCurrency) return;
    const intent = targetIntentRef.current.beginOpen();
    if (!await readSession().catch(() => null)) {
      requireSignIn();
      return;
    }
    if (!targetIntentRef.current.isCurrent(intent) || planRef.current.key !== planKey) return;
    const existingTarget = matchingAlert?.targetPrice != null && matchingAlert.currency?.toUpperCase() === alertCurrency
      ? Number(matchingAlert.targetPrice)
      : null;
    const existingDropPercent = existingTarget !== null
      && Number.isFinite(existingTarget)
      && existingTarget > 0
      ? Math.round((1 - existingTarget / providerCurrentTotal) * 100 * 1e6) / 1e6
      : null;
    const preserveExistingTarget = matchingAlert?.status === "PAUSED"
      && (!flight || matchingAlert.mode === "TARGET")
      && existingDropPercent !== null
      && existingDropPercent >= HOTEL_ALERT_MIN_DROP_PERCENT
      && existingDropPercent <= HOTEL_ALERT_MAX_DROP_PERCENT;
    setPreservedPausedTarget(preserveExistingTarget
      ? { id: matchingAlert.id, target: existingTarget!, currency: alertCurrency }
      : null);
    setDropPercent(preserveExistingTarget && existingDropPercent !== null
      ? existingDropPercent
      : !flight && existingTarget && Number.isFinite(existingTarget)
        ? hotelAlertDropPercentForTarget(providerCurrentTotal, existingTarget)
        : HOTEL_ALERT_DEFAULT_DROP_PERCENT);
    setError("");
    setSheetOpen(true);
  };

  const handleToggle = async (next: boolean) => {
    if (pendingRef.current || !alertKnown) return;
    if (next) {
      if (isTracking) return;
      await openSheet();
      return;
    }
    if (!matchingAlert || !isTracking) return;
    pendingRef.current = true;
    setPending(true);
    try {
      let paused: MobilePriceAlert | undefined;
      if (flight) {
        const alerts = (await travelApi.priceAlerts()).alerts;
        if (planRef.current.key !== planKey) return;
        const updated = await pauseActiveFlightPriceAlerts(alerts, plan, async (id) =>
          (await travelApi.updatePriceAlertStatus(id, "PAUSED")).alert,
        );
        paused = matchingFlightPriceAlert(updated, plan);
      } else {
        paused = (await travelApi.updatePriceAlertStatus(matchingAlert.id, "PAUSED")).alert;
      }
      if (planRef.current.key !== planKey) return;
      setCurrentMatchingAlert(paused);
      if (flight) onFeedback?.("paused");
    } catch (cause) {
      if (planRef.current.key !== planKey) return;
      // A partial failure must reflect any remaining active alerts on the switch.
      if (flight) await reconcile();
      if (cause instanceof TravelApiError && cause.status === 401) {
        setCurrentMatchingAlert(undefined);
        requireSignIn();
      } else {
        Alert.alert(message("priceAlertPauseError"), message("priceAlertPauseError"));
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const createAlert = async () => {
    if (pendingRef.current || !readyToCreate || alertTarget === null || !alertCurrency) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    try {
      if (!await readSession().catch(() => null)) {
        closeSheet();
        requireSignIn();
        return;
      }
      const alerts = (await travelApi.priceAlerts()).alerts;
      if (planRef.current.key !== planKey) return;
      const preservedPausedAlert = preservedPausedTarget
        ? alerts.find((alert) =>
            alert.id === preservedPausedTarget.id
            && alert.status === "PAUSED"
            && alert.currency?.toUpperCase() === preservedPausedTarget.currency
            && matchAlert([alert], plan)?.id === alert.id,
          )
        : undefined;
      const samePausedTarget = preservedPausedAlert ?? alerts.find((alert) =>
        alert.status === "PAUSED"
        && (!flight || alert.mode === "TARGET")
        && Number(alert.targetPrice) === alertTarget
        && alert.currency?.toUpperCase() === alertCurrency
        && matchAlert([alert], plan)?.id === alert.id,
      );
      const saved = samePausedTarget
        ? await travelApi.updatePriceAlertStatus(samePausedTarget.id, "ACTIVE")
        : await travelApi.createPriceAlert(flight
          ? buildFlightPriceAlertPayload(plan, alertTarget, alertCurrency)
          : buildHotelPriceAlertPayload(plan, alertTarget, alertCurrency, hotel));
      if (planRef.current.key !== planKey) return;
      setCurrentMatchingAlert(saved.alert);
      closeSheet();
      if (flight) onFeedback?.("active");
    } catch (cause) {
      if (planRef.current.key !== planKey) return;
      if (cause instanceof TravelApiError && cause.status === 401) {
        closeSheet();
        requireSignIn();
      } else if (cause instanceof TravelApiError && cause.status === 409) {
        if (flight) {
          try {
            const alerts = (await travelApi.priceAlerts()).alerts;
            if (planRef.current.key !== planKey) return;
            const duplicate = alerts.find((alert) => alert.mode === "TARGET"
              && (alert.status === "ACTIVE" || alert.status === "PAUSED")
              && Number(alert.targetPrice) === alertTarget
              && alert.currency?.toUpperCase() === alertCurrency
              && flightPriceAlertMatchesPlan(alert, plan));
            if (duplicate) {
              const saved = duplicate.status === "PAUSED"
                ? (await travelApi.updatePriceAlertStatus(duplicate.id, "ACTIVE")).alert
                : duplicate;
              if (planRef.current.key !== planKey) return;
              setCurrentMatchingAlert(saved); closeSheet(); onFeedback?.("active"); return;
            }
          } catch (recoveryError) {
            if (planRef.current.key !== planKey) return;
            if (recoveryError instanceof TravelApiError && recoveryError.status === 401) {
              closeSheet(); requireSignIn();
            } else setError(message("priceAlertCreateError"));
            return;
          }
        }
        await reconcile();
        if (planRef.current.key !== planKey) return;
        setError(message("priceAlertAlreadyExists"));
      } else {
        setError(message("priceAlertCreateError"));
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  if (!flight && currentTotal === null) return null;
  const toggleDisabled = pending || loadingAlert || !alertKnown || (!available && !isTracking) || (currentTotal === null && !isTracking);
  const formatTotal = (amount: number) => formatMarketCurrency(amount, visibleCurrency);
  const dropAmount = desiredTotal === null || currentTotal === null ? 0 : Math.max(0, currentTotal - desiredTotal);

  return (
    <View
      accessibilityLabel={alertTitle}
      style={[
        styles.compact,
        flight ? styles.flightCompact : styles.hotelWebCompact,
        flight
          ? { backgroundColor: theme.priceAlertSurface, borderColor: theme.priceAlertBorder }
          : { backgroundColor: theme.dark ? theme.surface : "#FFFFFF", borderColor: theme.dark ? theme.border : "#D8E1EC" },
      ]}
    >
      {flight ? (
        <Bell accessible={false} size={17} strokeWidth={2} color={theme.priceAlertAccent} />
      ) : (
        <View style={[styles.hotelBellTile, { backgroundColor: theme.dark ? theme.background : "#F5F7FB" }]}>
          <Bell accessible={false} size={18} strokeWidth={2} color={theme.dark ? theme.textPrimary : "#142033"} />
        </View>
      )}
      <View style={styles.compactCopy}>
        <Text numberOfLines={1} style={[styles.compactTitle, !flight && styles.hotelWebTitle, { color: flight || theme.dark ? theme.textPrimary : "#1A1A1A" }]}>{alertTitle}</Text>
        {!flight ? <Text numberOfLines={2} style={[styles.hotelWebSubtitle, { color: theme.dark ? theme.textSecondary : "#595959" }]}>
          {locale.startsWith("en") ? "Get automatic alerts when prices change." : alertBody}
        </Text> : null}
      </View>
      <View style={[styles.switchSlot, !flight && styles.hotelWebSwitchSlot]}>
        {flight ? (
          <>
            <View style={styles.flightLoadingSlot}>{pending ? <ActivityIndicator accessible={false} size="small" color={theme.priceAlertAccent} /> : null}</View>
            <Switch
              hitSlop={flight ? 6 : undefined}
              style={Platform.OS === "ios" ? styles.switchIos : undefined}
              accessibilityRole="switch"
              accessibilityLabel={alertTitle}
              accessibilityState={{ checked: isTracking, disabled: toggleDisabled, busy: pending || loadingAlert }}
              disabled={toggleDisabled}
              value={isTracking}
              onValueChange={(next) => void handleToggle(next)}
              trackColor={{ false: theme.dark ? "#465269" : "#CBD5E1", true: theme.switchTrackActive }}
              thumbColor={isTracking ? "#FFFFFF" : theme.dark ? "#D9E1EF" : "#FFFFFF"}
              ios_backgroundColor={theme.dark ? "#465269" : "#CBD5E1"}
            />
          </>
        ) : (
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={alertTitle}
            accessibilityState={{ checked: isTracking, disabled: toggleDisabled, busy: pending || loadingAlert }}
            disabled={toggleDisabled}
            onPress={() => void handleToggle(!isTracking)}
            style={[styles.hotelWebSwitchTouch, toggleDisabled && styles.hotelWebSwitchDisabled]}
          >
            <View style={[styles.hotelWebSwitchTrack, {
              borderColor: isTracking ? (theme.dark ? theme.switchTrackActive : "#004BB8") : theme.dark ? theme.border : "#CBD5E1",
              backgroundColor: isTracking ? (theme.dark ? theme.switchTrackActive : "#004BB8") : theme.dark ? "#465269" : "#E2E8F0",
            }]}>
              <View style={[styles.hotelWebSwitchThumb, isTracking && styles.hotelWebSwitchThumbOn]} />
            </View>
          </Pressable>
        )}
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!pending) closeSheet(); }}
        accessibilityViewIsModal
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
            accessibilityLabel={alertTitle}
          >
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
            >
              <View style={styles.header}>
                <View style={styles.headerCopy}>
                  <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{alertTitle}</Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{alertBody}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t("cancel")} ${alertTitle}`}
                  disabled={pending}
                  onPress={closeSheet}
                  style={({ pressed }) => [styles.close, pressed && styles.pressed]}
                >
                  <X accessible={false} size={21} strokeWidth={1.5} color={theme.icon} />
                </Pressable>
              </View>

              <View style={[styles.currentPriceCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{currentLabel}</Text>
                <Text style={[styles.currentPrice, { color: theme.textPrimary }]}>{currentTotal === null ? "—" : formatTotal(currentTotal)}</Text>
              </View>

              <View style={styles.sliderBlock}>
                <View style={styles.sliderHeading}>
                  <Text style={[styles.sliderLabel, { color: theme.textPrimary }]}>{message("priceDrop")}</Text>
                  <Text style={[styles.percent, { color: ui.blue }]}>{formatDropPercent(dropPercent)}%</Text>
                </View>
                <FlightRangeSlider
                  available={{ min: HOTEL_ALERT_MIN_DROP_PERCENT, max: HOTEL_ALERT_MAX_DROP_PERCENT }}
                  selected={{ min: HOTEL_ALERT_MIN_DROP_PERCENT, max: dropPercent }}
                  step={1}
                  singleMaximum
                  formatValue={(value) => `${formatDropPercent(value)}%`}
                  accessibilityLabel={message("priceDrop")}
                  onChange={(range) => {
                    setPreservedPausedTarget(null);
                    setDropPercent(Math.round(range.max));
                  }}
                />
                <View style={styles.sliderEnds}>
                  <Text style={[styles.sliderEnd, { color: theme.textSecondary }]}>1%</Text>
                  <Text style={[styles.sliderEnd, { color: theme.textSecondary }]}>15%</Text>
                </View>
              </View>

              <View style={[styles.summary, { borderColor: theme.border }]}>
                <View style={styles.metric}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{message("dropsBy")}</Text>
                  <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{formatTotal(dropAmount)}</Text>
                </View>
                <View style={[styles.metric, styles.metricRight]}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{targetLabel}</Text>
                  <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{desiredTotal === null ? "—" : formatTotal(desiredTotal)}</Text>
                </View>
              </View>

              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={saveLabel}
                accessibilityState={{ disabled: !readyToCreate, busy: pending }}
                disabled={!readyToCreate}
                onPress={() => void createAlert()}
                style={({ pressed }) => [styles.create, { backgroundColor: ui.blue }, !readyToCreate && styles.createDisabled, pressed && readyToCreate && styles.createPressed]}
              >
                {pending ? <ActivityIndicator accessible={false} size="small" color="white" /> : null}
                <Text style={styles.createText}>{pending ? message("creating") : saveLabel}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Flight and Hotel use the same target editor and lifecycle protections. */
export function FlightPriceAlert(props: Omit<Props, "hotelResults" | "hotel" | "product"> & { flightResults: FlightResult[] }) {
  return <HotelPriceAlert {...props} product="flight" hotelResults={[]} />;
}

const styles = StyleSheet.create({
  flightCompact: { minHeight: 52 },
  flightLoadingSlot: { width: 20, minHeight: 44, alignItems: "center", justifyContent: "center" },
  compact: { width: "100%", minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 8 },
  hotelWebCompact: { minHeight: 58, paddingVertical: 8, gap: 12 },
  hotelBellTile: { width: 36, height: 36, borderRadius: 8, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  hotelWebTitle: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  hotelWebSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: "400", fontFamily: appFonts.regular },
  hotelWebSwitchSlot: { minWidth: 44, justifyContent: "center", gap: 0 },
  hotelWebSwitchTouch: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hotelWebSwitchDisabled: { opacity: 0.55 },
  hotelWebSwitchTrack: { width: 42, height: 24, borderWidth: 1, borderRadius: 12, justifyContent: "center" },
  hotelWebSwitchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF", marginLeft: 2, shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 1, elevation: 1 },
  hotelWebSwitchThumbOn: { transform: [{ translateX: 18 }] },
  compactCopy: { flex: 1, minWidth: 0 },
  compactTitle: { fontSize: 12.5, lineHeight: 16, fontWeight: "700", fontFamily: appFonts.bold },
  switchSlot: { minWidth: 51, minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  switchIos: { transform: [{ translateY: 8 }] },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.45)" },
  sheet: { maxHeight: "92%", borderTopWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" },
  sheetScroll: { flexShrink: 1 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, gap: 13 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headerCopy: { flex: 1, minWidth: 0, paddingTop: 3 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "700", fontFamily: appFonts.bold },
  subtitle: { marginTop: 2, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  currentPriceCard: { minHeight: 58, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, justifyContent: "center" },
  currentPrice: { marginTop: 1, fontSize: 21, lineHeight: 26, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"] },
  sliderBlock: { gap: 0 },
  sliderHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sliderLabel: { fontSize: 15, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  percent: { color: ui.blue, fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  sliderEnds: { marginTop: -6, flexDirection: "row", justifyContent: "space-between" },
  sliderEnd: { fontSize: 11, lineHeight: 15, fontWeight: "400", fontFamily: appFonts.regular },
  summary: { minHeight: 58, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  metric: { flex: 1, minWidth: 0 },
  metricRight: { alignItems: "flex-end" },
  metricLabel: { fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  metricValue: { marginTop: 1, fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"] },
  error: { color: "#A4262C", fontSize: 12, lineHeight: 18, fontWeight: "500", fontFamily: appFonts.medium },
  create: { minHeight: 46, borderRadius: 10, backgroundColor: ui.blue, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  createDisabled: { opacity: 0.42 },
  createPressed: { backgroundColor: "#003B91" },
  createText: { color: "white", fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
});
