import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  FilePenLine,
  SlidersHorizontal,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import {
  deriveNearbyDateSuggestion,
  getDateWindow,
  initialDateWindowStart,
  parseCalendarDate,
  shiftCalendarDate,
  type DateStripPrice,
} from "./dateStripModel";
import type { NearbyFareState } from "./nearbyFareModel";
import { currencyAccessibilityLabel, formatCurrency } from "../currency/displayCurrency";

export const ui = {
  blue: "#0754F7",
  navy: "#07152F",
  muted: "#5E6A82",
  border: "#DCE2EC",
  pale: "#F7F9FC",
  green: "#168542",
};
export const money = (currency?: string, amount?: number) =>
  amount == null
    ? ""
    : formatCurrency(amount, currency || "USD");
export const shortDate = (v?: string) =>
  v
    ? new Date(`${v}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";
export const clock = (v?: string) => {
  const wallTime = v?.match(/T(\d{2}):(\d{2})/);
  if (!wallTime) return "";
  const hour = Number(wallTime[1]);
  return `${hour % 12 || 12}:${wallTime[2]} ${hour >= 12 ? "PM" : "AM"}`;
};
export function Logo() {
  return (
    <Image
      source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
      resizeMode="contain"
      style={s.logo}
    />
  );
}
export function TopBar({
  detail = false,
  flightResults = false,
  hasUnreadNotifications = false,
  onNotificationsPress,
  onPriceAlertPress,
  priceAlertDisabled = false,
  onSharePress,
}: {
  detail?: boolean;
  flightResults?: boolean;
  hasUnreadNotifications?: boolean;
  onNotificationsPress?: () => void;
  onPriceAlertPress?: () => void;
  priceAlertDisabled?: boolean;
  onSharePress?: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={[s.top, { backgroundColor: flightResults ? theme.background : theme.surface }]}>
      <View style={[s.topSide, detail && s.detailTopSide]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={s.hit}
        >
          {flightResults ? (
            <ArrowLeft size={25} strokeWidth={2} color={theme.icon} />
          ) : (
            <FlowIcon name="back" size={25} color={theme.icon} />
          )}
        </Pressable>
      </View>
      <Logo />
      <View style={[s.topActions, detail && s.detailTopActions]}>
        {detail ? (
          <>
            {onPriceAlertPress || priceAlertDisabled ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Price alert"
                accessibilityState={{ disabled: priceAlertDisabled }}
                onPress={onPriceAlertPress}
                disabled={priceAlertDisabled}
                style={s.hit}
              >
                <FlowIcon name="bell" color={theme.icon} />
              </Pressable>
            ) : (
              <FlowIcon name="heart" color={theme.icon} />
            )}
            {onSharePress ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Share flight" onPress={onSharePress} style={s.hit}>
                <FlowIcon name="share" color={theme.icon} />
              </Pressable>
            ) : (
              <FlowIcon name="share" color={theme.icon} />
            )}
          </>
        ) : flightResults ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={onNotificationsPress}
            disabled={!onNotificationsPress}
            style={s.hit}
          >
            <Bell size={24} strokeWidth={2} color={theme.icon} />
            {hasUnreadNotifications ? <View accessibilityLabel="Unread notifications" style={s.dot} /> : null}
          </Pressable>
        ) : (
          <View>
            <FlowIcon name="bell" />
            {hasUnreadNotifications ? <View accessibilityLabel="Unread notifications" style={s.dot} /> : null}
          </View>
        )}
      </View>
    </View>
  );
}
export function Pill({
  label,
  active = false,
  icon,
  flightResultsIcon,
  flightResultsChevron = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  icon?: FlowIconName;
  flightResultsIcon?: "edit" | "filters";
  flightResultsChevron?: boolean;
  onPress?: () => void;
}) {
  const { theme } = useAppTheme();
  const flightResults = Boolean(flightResultsIcon || flightResultsChevron);
  const selectedColor = theme.dark ? "#8FB5FF" : ui.blue;
  const iconColor = flightResults
    ? active ? selectedColor : theme.textSecondary
    : active ? ui.blue : ui.navy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={flightResults ? { top: 3, bottom: 3, left: 2, right: 2 } : undefined}
      style={({ pressed }) => [
        s.pill,
        flightResults && s.flightPill,
        flightResults && { backgroundColor: theme.dark ? theme.surface : ui.pale, borderColor: theme.border },
        active && !flightResults && s.pillActive,
        flightResults && active && { backgroundColor: theme.dark ? "#142B55" : "#EEF4FF", borderColor: ui.blue },
        flightResults && pressed && s.flightPillPressed,
      ]}
    >
      {flightResultsIcon === "edit" ? (
        <FilePenLine size={18} strokeWidth={2} color={iconColor} />
      ) : flightResultsIcon === "filters" ? (
        <SlidersHorizontal size={17} strokeWidth={2} color={iconColor} />
      ) : icon ? (
        <FlowIcon name={icon} size={15} color={iconColor} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          s.pillText,
          flightResults && s.flightPillText,
          flightResults && { color: active ? selectedColor : theme.textPrimary },
          flightResults && active && s.flightPillTextActive,
          active && !flightResults && { color: ui.blue },
        ]}
      >
        {label}
      </Text>
      {flightResultsChevron ? (
        <ChevronRight size={15} strokeWidth={1.9} color={iconColor} />
      ) : !icon && !flightResultsIcon ? (
        <FlowIcon name="chevron" size={12} color={iconColor} />
      ) : null}
    </Pressable>
  );
}
export function DateStrip({
  date,
  priceByDate,
  fareStateByDate,
  currency = "USD",
  flightResults = false,
  nearbyIntelligence = false,
  displayCurrency,
  searchIdentity,
  onSelect,
}: {
  date: string;
  priceByDate: Record<string, DateStripPrice>;
  fareStateByDate?: Record<string, NearbyFareState>;
  currency?: string;
  flightResults?: boolean;
  nearbyIntelligence?: boolean;
  displayCurrency?: string;
  searchIdentity?: string;
  onSelect: (v: string) => void;
}) {
  const { theme } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const railRef = useRef<ScrollView>(null);
  const centeredIdentity = useRef<string | undefined>(undefined);
  // Keep three dates fully visible while letting the narrower fourth tile peek into view.
  const flightDateWidth = Math.min(96, Math.max(76, (windowWidth - 43) / 3.65));
  const [visibleStart, setVisibleStart] = useState(() =>
    initialDateWindowStart(date),
  );

  useEffect(() => {
    setVisibleStart(initialDateWindowStart(date));
  }, [date]);

  const visibleDates = getDateWindow(visibleStart);
  const nearbySuggestion = nearbyIntelligence
    ? deriveNearbyDateSuggestion(date, visibleDates, priceByDate)
    : null;
  const moveWindow = (days: number) =>
    setVisibleStart((current) => shiftCalendarDate(current, days));
  const centerSelectedDate = () => {
    if (!flightResults || !searchIdentity || centeredIdentity.current === searchIdentity) return;
    const selectedIndex = visibleDates.indexOf(date);
    if (selectedIndex < 0) return;
    centeredIdentity.current = searchIdentity;
    const tileStride = flightDateWidth + 9;
    railRef.current?.scrollTo({
      x: Math.max(0, selectedIndex * tileStride - (windowWidth - flightDateWidth) / 2 + 16),
      animated: false,
    });
  };
  useEffect(() => {
    if (!flightResults || !searchIdentity) return;
    const frame = requestAnimationFrame(centerSelectedDate);
    return () => cancelAnimationFrame(frame);
  }, [date, flightResults, searchIdentity, visibleStart, windowWidth]);

  return (
    <>
    <View style={[s.dateNavigator, flightResults && s.flightDateNavigator]}>
      {!flightResults ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show earlier dates"
          onPress={() => moveWindow(-1)}
          style={s.arrow}
        >
          <FlowIcon name="back" size={20} />
        </Pressable>
      ) : null}
      <ScrollView
        ref={railRef}
        horizontal
        style={[s.dateRail, flightResults && s.flightDateRail]}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.dates, flightResults && s.flightDates]}
        onContentSizeChange={centerSelectedDate}
      >
        {visibleDates.map((iso) => {
          const x = parseCalendarDate(iso);
          const active = iso === date;
          const price = priceByDate[iso];
          const fareState = fareStateByDate?.[iso];
          const hasPrice = price != null;
          const fareLabel = hasPrice
            ? price.accessibilityLabel
            : fareState?.status === "loading" ? "fare loading"
            : fareState?.status === "unavailable" ? "fare unavailable"
            : fareState?.status === "error" ? "fare could not be checked"
            : "fare not checked";
          const fullDate = x.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={flightResults ? `${fullDate}, ${fareLabel}` : undefined}
              onPress={() => { if (!active) onSelect(iso); }}
              hitSlop={flightResults ? 6 : undefined}
              style={({ pressed }) => [
                s.date,
                flightResults && s.flightDate,
                flightResults && { width: flightDateWidth },
                flightResults && {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
                !flightResults && active && s.dateActive,
                flightResults && active && {
                  backgroundColor: theme.dark ? "#142B55" : "#F0F5FF",
                  borderColor: ui.blue,
                },
                pressed && s.datePressed,
              ]}
            >
              {flightResults && active ? <View accessible={false} style={s.flightDateSelectedAccent} /> : null}
              {flightResults ? (
                <>
                  <Text style={[s.day, s.flightDateLabel, { color: theme.textPrimary }, active && { color: theme.dark ? "#8FB5FF" : ui.blue }]}>
                    {shortDate(iso).toUpperCase()}
                  </Text>
                  <Text style={[s.day, s.flightDateWeekday, { color: theme.textSecondary }, active && { color: theme.dark ? "#8FB5FF" : ui.blue }]}>
                    {x.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                  </Text>
                </>
              ) : (
                <>
              <Text
                style={[
                  s.day,
                  flightResults && s.flightDateWeekday,
                  flightResults && { color: theme.textSecondary },
                  flightResults && active && { color: theme.dark ? "#A9C4FF" : "#5276C5" },
                ]}
              >
                {x.toLocaleDateString("en-US", { weekday: "short" })}
              </Text>
              <Text
                style={[
                  s.day,
                  flightResults && s.flightDateLabel,
                  flightResults && { color: theme.textPrimary },
                  active && { color: theme.dark ? "#8FB5FF" : ui.blue },
                ]}
              >
                {shortDate(iso)}
              </Text>
                </>
              )}
              {hasPrice || flightResults ? (
                <Text
                  accessible={!flightResults}
                  accessibilityLabel={price?.accessibilityLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={flightResults ? 0.78 : 0.85}
                  style={[
                    s.datePrice,
                    flightResults && s.flightDatePrice,
                    flightResults && { color: theme.textPrimary },
                    active && { color: theme.dark ? "#8FB5FF" : ui.blue },
                    flightResults && nearbySuggestion?.date === iso && !active && { color: ui.green },
                  ]}
                >
                  {hasPrice ? (price.formatted ?? money(currency, price.amount))
                    : fareState?.status === "loading" ? "•••"
                    : fareState?.status === "unavailable" ? "No fare"
                    : fareState?.status === "error" ? "Try later"
                    : "—"}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {!flightResults ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show later dates"
          onPress={() => moveWindow(1)}
          style={s.arrow}
        >
          <FlowIcon name="chevron" size={20} />
        </Pressable>
      ) : null}
    </View>
    {nearbySuggestion && displayCurrency ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Cheaper nearby date, ${parseCalendarDate(nearbySuggestion.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, save ${currencyAccessibilityLabel(nearbySuggestion.savings, displayCurrency)}`}
        onPress={() => onSelect(nearbySuggestion.date)}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        style={({ pressed }) => [s.nearbyDateInsight, pressed && s.datePressed]}
      >
        <Text numberOfLines={1} ellipsizeMode="tail" style={[s.nearbyDateInsightText, { color: theme.textSecondary, fontFamily: appFonts.semibold }]}>
          {`Cheaper nearby: ${parseCalendarDate(nearbySuggestion.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · Save ${formatCurrency(nearbySuggestion.savings, displayCurrency)}`}
        </Text>
      </Pressable>
    ) : null}
    </>
  );
}
export function Button({
  label,
  outline = false,
  onPress,
  disabled = false,
  external = false,
  flightResults = false,
}: {
  label: string;
  outline?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  external?: boolean;
  flightResults?: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, outline && s.outline, flightResults && outline && { backgroundColor: theme.surface }, disabled && { opacity: 0.45 }]}
    >
      <View style={s.buttonContent}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[s.buttonText, outline && { color: ui.blue }]}
        >
          {label}
        </Text>
        {external ? (
          <FlowIcon name="external" size={16} color={outline ? ui.blue : "white"} />
        ) : null}
      </View>
    </Pressable>
  );
}
export function Badge({
  children,
  green = false,
  flightResults = false,
}: {
  children: React.ReactNode;
  green?: boolean;
  flightResults?: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={[s.badge, flightResults && theme.dark && { backgroundColor: "#173568" }, green && { backgroundColor: flightResults && theme.dark ? "#153B2B" : "#EAF8ED" }]}>
      <Text style={[s.badgeText, flightResults && theme.dark && { color: "#8FB5FF" }, green && { color: flightResults && theme.dark ? "#72D69A" : ui.green }]}>
        {children}
      </Text>
    </View>
  );
}
export function Empty({
  title,
  body,
  retry,
  retryLabel = "Try again",
  edit,
  flightResults = false,
}: {
  title: string;
  body: string;
  retry?: () => void;
  retryLabel?: string;
  edit: () => void;
  flightResults?: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={s.empty}>
      <FlowIcon name="search" size={38} color={ui.blue} />
      <Text style={[s.h2, flightResults && { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[s.meta, flightResults && { color: theme.textSecondary }]}>{body}</Text>
      {retry ? <Button label={retryLabel} onPress={retry} flightResults={flightResults} /> : null}
      <Button label="Edit search" outline onPress={edit} flightResults={flightResults} />
    </View>
  );
}
export const s = StyleSheet.create({
  logo: { width: 128, height: 30 },
  top: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
  },
  hit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topSide: { width: 76, alignItems: "flex-start" },
  detailTopSide: { width: 88 },
  topActions: {
    width: 76,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18,
  },
  detailTopActions: { width: 88, gap: 0, alignItems: "center" },
  dot: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F22456",
  },
  pill: {
    height: 38,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 10,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  pillActive: { borderColor: "#B9CBFF", backgroundColor: "#F6F8FF" },
  pillText: { fontSize: 12, fontWeight: "700", color: ui.navy },
  flightPill: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  flightPillPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  flightPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  flightPillTextActive: { fontWeight: "700", fontFamily: appFonts.bold },
  dateNavigator: {
    height: 80,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateRail: { height: 80, flex: 1 },
  dates: { gap: 9, alignItems: "center" },
  flightDateNavigator: { height: 82, paddingHorizontal: 0 },
  nearbyDateInsight: { minHeight: 28, justifyContent: "center", paddingHorizontal: 14, marginTop: -2 },
  nearbyDateInsightText: { minWidth: 0, flexShrink: 1, fontSize: 11, lineHeight: 15, fontWeight: "600" },
  flightDateRail: { height: 82 },
  flightDates: { paddingHorizontal: 16, paddingVertical: 5 },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.border,
    alignItems: "center",
    justifyContent: "center",
  },
  date: {
    width: 80,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8EBF1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  flightDate: {
    minWidth: 76,
    maxWidth: 96,
    height: 70,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  flightDateSelectedAccent: { position: "absolute", top: 0, left: 8, right: 8, height: 2, backgroundColor: ui.blue, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  dateActive: { borderColor: ui.blue, backgroundColor: "#F5F8FF" },
  datePressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  day: { fontSize: 12, lineHeight: 16, color: ui.muted },
  datePrice: { maxWidth: "100%", fontSize: 16, fontWeight: "800", color: ui.navy, marginTop: 1 },
  flightDateWeekday: { width: "100%", fontSize: 10, fontWeight: "600", fontFamily: appFonts.semibold, lineHeight: 13, letterSpacing: 0.5, textAlign: "center" },
  flightDateLabel: { width: "100%", fontSize: 11, fontWeight: "700", fontFamily: appFonts.bold, lineHeight: 14, letterSpacing: 0.2, textAlign: "center" },
  flightDatePrice: { width: "100%", minWidth: 0, flexShrink: 1, height: 14, marginTop: 3, fontSize: 11, fontWeight: "600", fontFamily: appFonts.semibold, textAlign: "center", lineHeight: 14, paddingHorizontal: 1, fontVariant: ["tabular-nums"] },
  button: {
    height: 45,
    minWidth: 104,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: ui.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  outline: { backgroundColor: "white", borderWidth: 1, borderColor: ui.blue },
  buttonText: { color: "white", fontWeight: "800", fontSize: 14 },
  buttonContent: { maxWidth: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 7,
    backgroundColor: "#E8EFFF",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: { color: "#1546A0", fontWeight: "800", fontSize: 11 },
  empty: {
    minHeight: 340,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  h2: { fontSize: 19, fontWeight: "800", color: ui.navy },
  meta: { fontSize: 12, color: ui.muted, lineHeight: 17, textAlign: "center" },
});
