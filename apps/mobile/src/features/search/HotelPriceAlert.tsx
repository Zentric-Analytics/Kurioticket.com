import { useCallback, useMemo, useRef, useState } from "react";
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
  type MobilePriceAlert,
} from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { travelAccountMessage } from "../../localization/travelAccountMessages";
import { readSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { signInHref } from "../auth/signInIntent";
import { displayPrice, formatMarketCurrency, type ExchangeRates } from "../currency/displayCurrency";
import {
  buildHotelPriceAlertPayload,
  matchingHotelPriceAlert,
} from "../flow/hotelPriceAlertModel";
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
import { ui } from "./SearchUi";

type Props = {
  plan: SearchPlan;
  hotelResults: HotelResult[];
  available?: boolean;
  displayCurrency: string;
  rates: ExchangeRates;
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
  available = true,
  displayCurrency,
  rates,
}: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { locale, t } = useMobileLocalization();
  const message = useCallback(
    (key: Parameters<typeof travelAccountMessage>[1]) => travelAccountMessage(locale, key),
    [locale],
  );
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
  const planRef = useRef(plan);
  planRef.current = plan;
  const planKey = plan.key;

  const matchingAlert = matchingAlertState?.planKey === planKey ? matchingAlertState.alert : undefined;
  const isTracking = matchingAlert?.status === "ACTIVE";
  const alertKnown = reconciledPlanKey === planKey;
  const priceBasis = useMemo(
    () => hotelAlertPriceBasis(hotelResults, displayCurrency, rates),
    [displayCurrency, hotelResults, rates],
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
        if (reconciliation === reconciliationRef.current) {
          setCurrentMatchingAlert(undefined);
          setReconciledPlanKey(reconciliationPlanKey);
        }
        return;
      }
      const alerts = (await travelApi.priceAlerts()).alerts;
      if (reconciliation !== reconciliationRef.current) return;
      setCurrentMatchingAlert(matchingHotelPriceAlert(alerts, reconciliationPlan));
      setReconciledPlanKey(reconciliationPlanKey);
    } catch (cause) {
      if (reconciliation === reconciliationRef.current && cause instanceof TravelApiError && cause.status === 401) {
        setCurrentMatchingAlert(undefined);
        setReconciledPlanKey(reconciliationPlanKey);
      }
    } finally {
      if (reconciliation === reconciliationRef.current) setLoadingAlert(false);
    }
  }, [planKey, setCurrentMatchingAlert]);

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
    if (!targetIntentRef.current.isCurrent(intent)) return;
    const existingTarget = matchingAlert?.targetPrice != null && matchingAlert.currency?.toUpperCase() === alertCurrency
      ? Number(matchingAlert.targetPrice)
      : null;
    const existingDropPercent = existingTarget !== null
      && Number.isFinite(existingTarget)
      && existingTarget > 0
      ? (1 - existingTarget / providerCurrentTotal) * 100
      : null;
    const preserveExistingTarget = matchingAlert?.status === "PAUSED"
      && existingDropPercent !== null
      && existingDropPercent >= HOTEL_ALERT_MIN_DROP_PERCENT
      && existingDropPercent <= HOTEL_ALERT_MAX_DROP_PERCENT;
    setPreservedPausedTarget(preserveExistingTarget
      ? { id: matchingAlert.id, target: existingTarget!, currency: alertCurrency }
      : null);
    setDropPercent(preserveExistingTarget && existingDropPercent !== null
      ? existingDropPercent
      : existingTarget && Number.isFinite(existingTarget)
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
      setCurrentMatchingAlert((await travelApi.updatePriceAlertStatus(matchingAlert.id, "PAUSED")).alert);
    } catch (cause) {
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
      const preservedPausedAlert = preservedPausedTarget
        ? alerts.find((alert) =>
            alert.id === preservedPausedTarget.id
            && alert.status === "PAUSED"
            && alert.currency?.toUpperCase() === preservedPausedTarget.currency
            && matchingHotelPriceAlert([alert], plan)?.id === alert.id,
          )
        : undefined;
      const samePausedTarget = preservedPausedAlert ?? alerts.find((alert) =>
        alert.status === "PAUSED"
        && Number(alert.targetPrice) === alertTarget
        && alert.currency?.toUpperCase() === alertCurrency
        && matchingHotelPriceAlert([alert], plan)?.id === alert.id,
      );
      const saved = samePausedTarget
        ? await travelApi.updatePriceAlertStatus(samePausedTarget.id, "ACTIVE")
        : await travelApi.createPriceAlert(buildHotelPriceAlertPayload(plan, alertTarget, alertCurrency));
      setCurrentMatchingAlert(saved.alert);
      closeSheet();
    } catch (cause) {
      if (cause instanceof TravelApiError && cause.status === 401) {
        closeSheet();
        requireSignIn();
      } else if (cause instanceof TravelApiError && cause.status === 409) {
        await reconcile();
        setError(message("priceAlertAlreadyExists"));
      } else {
        setError(message("priceAlertCreateError"));
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  if (currentTotal === null) return null;
  const toggleDisabled = pending || loadingAlert || !alertKnown || (!available && !isTracking);
  const formatTotal = (amount: number) => formatMarketCurrency(amount, visibleCurrency);
  const dropAmount = desiredTotal === null ? 0 : Math.max(0, currentTotal - desiredTotal);

  return (
    <View
      accessibilityLabel={message("hotelAlertTitle")}
      style={[styles.compact, { backgroundColor: theme.priceAlertSurface, borderColor: theme.priceAlertBorder }]}
    >
      <Bell accessible={false} size={17} strokeWidth={2} color={theme.priceAlertAccent} />
      <View style={styles.compactCopy}>
        <Text numberOfLines={1} style={[styles.compactTitle, { color: theme.textPrimary }]}>{message("hotelAlertTitle")}</Text>
      </View>
      <View style={styles.switchSlot}>
        {pending ? <ActivityIndicator accessible={false} size="small" color={theme.priceAlertAccent} /> : null}
        <Switch
          style={Platform.OS === "ios" ? styles.switchIos : undefined}
          accessibilityRole="switch"
          accessibilityLabel={message("hotelAlertTitle")}
          accessibilityState={{ checked: isTracking, disabled: toggleDisabled, busy: pending || loadingAlert }}
          disabled={toggleDisabled}
          value={isTracking}
          onValueChange={(next) => void handleToggle(next)}
          trackColor={{ false: theme.dark ? "#465269" : "#CBD5E1", true: theme.switchTrackActive }}
          thumbColor={isTracking ? "#FFFFFF" : theme.dark ? "#D9E1EF" : "#FFFFFF"}
          ios_backgroundColor={theme.dark ? "#465269" : "#CBD5E1"}
        />
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
            accessibilityLabel={message("hotelAlertTitle")}
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
                  <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{message("hotelAlertTitle")}</Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{message("hotelAlertBody")}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t("cancel")} ${message("hotelAlertTitle")}`}
                  disabled={pending}
                  onPress={closeSheet}
                  style={({ pressed }) => [styles.close, pressed && styles.pressed]}
                >
                  <X accessible={false} size={21} strokeWidth={1.5} color={theme.icon} />
                </Pressable>
              </View>

              <View style={[styles.currentPriceCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{message("currentTotal")}</Text>
                <Text style={[styles.currentPrice, { color: theme.textPrimary }]}>{formatTotal(currentTotal)}</Text>
              </View>

              <View style={styles.sliderBlock}>
                <View style={styles.sliderHeading}>
                  <Text style={[styles.sliderLabel, { color: theme.textPrimary }]}>{message("priceDrop")}</Text>
                  <Text style={styles.percent}>{formatDropPercent(dropPercent)}%</Text>
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
                  <Text style={[styles.sliderEnd, { color: theme.textSecondary }]}>50%</Text>
                </View>
              </View>

              <View style={[styles.summary, { borderColor: theme.border }]}>
                <View style={styles.metric}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{message("dropsBy")}</Text>
                  <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{formatTotal(dropAmount)}</Text>
                </View>
                <View style={[styles.metric, styles.metricRight]}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{message("targetTotal")}</Text>
                  <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{desiredTotal === null ? "—" : formatTotal(desiredTotal)}</Text>
                </View>
              </View>

              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={message("createAlert")}
                accessibilityState={{ disabled: !readyToCreate, busy: pending }}
                disabled={!readyToCreate}
                onPress={() => void createAlert()}
                style={({ pressed }) => [styles.create, !readyToCreate && styles.createDisabled, pressed && readyToCreate && styles.createPressed]}
              >
                {pending ? <ActivityIndicator accessible={false} size="small" color="white" /> : null}
                <Text style={styles.createText}>{pending ? message("creating") : message("createAlert")}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { width: "100%", minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 8 },
  compactCopy: { flex: 1, minWidth: 0 },
  compactTitle: { fontSize: 12.5, lineHeight: 16, fontWeight: "700", fontFamily: appFonts.bold },
  switchSlot: { minWidth: 51, minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  switchIos: { transform: [{ translateY: 8 }] },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.45)" },
  sheet: { maxHeight: "92%", borderTopWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" },
  sheetScroll: { flexShrink: 1 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headerCopy: { flex: 1, minWidth: 0, paddingTop: 5 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "700", fontFamily: appFonts.bold },
  subtitle: { marginTop: 3, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  currentPriceCard: { minHeight: 66, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" },
  currentPrice: { marginTop: 2, fontSize: 22, lineHeight: 28, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"] },
  sliderBlock: { gap: 2 },
  sliderHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sliderLabel: { fontSize: 15, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  percent: { color: ui.blue, fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  sliderEnds: { marginTop: -4, flexDirection: "row", justifyContent: "space-between" },
  sliderEnd: { fontSize: 11, lineHeight: 15, fontWeight: "400", fontFamily: appFonts.regular },
  summary: { minHeight: 66, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  metric: { flex: 1, minWidth: 0 },
  metricRight: { alignItems: "flex-end" },
  metricLabel: { fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  metricValue: { marginTop: 2, fontSize: 16, lineHeight: 21, fontWeight: "700", fontFamily: appFonts.bold, fontVariant: ["tabular-nums"] },
  error: { color: "#A4262C", fontSize: 12, lineHeight: 18, fontWeight: "500", fontFamily: appFonts.medium },
  create: { minHeight: 50, borderRadius: 10, backgroundColor: ui.blue, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  createDisabled: { opacity: 0.42 },
  createPressed: { backgroundColor: "#003B91" },
  createText: { color: "white", fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
});
