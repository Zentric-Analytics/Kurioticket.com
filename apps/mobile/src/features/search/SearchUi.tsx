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
import { useEffect, useState } from "react";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { useAppTheme } from "../../theme/AppTheme";
import {
  getDateWindow,
  initialDateWindowStart,
  parseCalendarDate,
  shiftCalendarDate,
} from "./dateStripModel";

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
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 0,
      }).format(amount);
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
}: {
  detail?: boolean;
  flightResults?: boolean;
  hasUnreadNotifications?: boolean;
  onNotificationsPress?: () => void;
  onPriceAlertPress?: () => void;
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
            {onPriceAlertPress ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Price alert"
                onPress={onPriceAlertPress}
                style={s.hit}
              >
                <FlowIcon name="bell" color={theme.icon} />
              </Pressable>
            ) : (
              <FlowIcon name="heart" color={theme.icon} />
            )}
            <FlowIcon name="share" color={theme.icon} />
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
  const iconColor = active ? ui.blue : flightResults ? theme.icon : ui.navy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        s.pill,
        flightResults && { backgroundColor: theme.surface, borderColor: theme.border },
        active && s.pillActive,
        flightResults && active && { backgroundColor: theme.dark ? "#142B55" : "#F6F8FF", borderColor: ui.blue },
      ]}
    >
      {flightResultsIcon === "edit" ? (
        <FilePenLine size={18} strokeWidth={2} color={iconColor} />
      ) : flightResultsIcon === "filters" ? (
        <SlidersHorizontal size={18} strokeWidth={2} color={iconColor} />
      ) : icon ? (
        <FlowIcon name={icon} size={15} color={iconColor} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[s.pillText, flightResults && { color: theme.textPrimary }, active && { color: ui.blue }]}
      >
        {label}
      </Text>
      {flightResultsChevron ? (
        <ChevronRight size={17} strokeWidth={2} color={iconColor} />
      ) : !icon && !flightResultsIcon ? (
        <FlowIcon name="chevron" size={12} color={iconColor} />
      ) : null}
    </Pressable>
  );
}
export function DateStrip({
  date,
  prices,
  formattedPrices,
  priceAccessibilityLabels,
  currency = "USD",
  flightResults = false,
  onSelect,
}: {
  date: string;
  prices: (number | undefined)[];
  formattedPrices?: (string | undefined)[];
  priceAccessibilityLabels?: (string | undefined)[];
  currency?: string;
  flightResults?: boolean;
  onSelect: (v: string) => void;
}) {
  const { theme } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  // Account for the flight rail's 32px padding and the two gaps between three
  // tiles. Clamping keeps the tiles useful on both compact and wide phones.
  const flightDateWidth = Math.min(116, Math.max(96, (windowWidth - 50) / 3));
  const [visibleStart, setVisibleStart] = useState(() =>
    initialDateWindowStart(date),
  );

  useEffect(() => {
    setVisibleStart(initialDateWindowStart(date));
  }, [date]);

  const visibleDates = getDateWindow(visibleStart);
  const moveWindow = (days: number) =>
    setVisibleStart((current) => shiftCalendarDate(current, days));

  return (
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
        horizontal
        style={s.dateRail}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.dates, flightResults && s.flightDates]}
      >
        {visibleDates.map((iso, i) => {
          const x = parseCalendarDate(iso);
          const active = iso === date;
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(iso)}
              style={[
                s.date,
                flightResults && s.flightDate,
                flightResults && { width: flightDateWidth },
                flightResults && { backgroundColor: theme.surface, borderColor: theme.border },
                active && s.dateActive,
                flightResults && active && { backgroundColor: theme.dark ? "#142B55" : "#F5F8FF", borderColor: ui.blue },
              ]}
            >
              <Text style={[s.day, flightResults && { color: theme.textSecondary }]}>
                {x.toLocaleDateString("en-US", { weekday: "short" })}
              </Text>
              <Text
                style={[s.day, flightResults && { color: theme.textSecondary }, active && { color: ui.blue, fontWeight: "800" }]}
              >
                {shortDate(iso)}
              </Text>
              {prices[i] != null ? (
                <Text
                  accessibilityLabel={priceAccessibilityLabels?.[i]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={flightResults ? 0.78 : 0.85}
                  style={[s.datePrice, flightResults && { color: theme.textPrimary }, active && { color: ui.blue }]}
                >
                  {formattedPrices ? (formattedPrices[i] ?? "—") : money(currency, prices[i])}
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
  dateNavigator: {
    height: 80,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateRail: { height: 80, flex: 1 },
  dates: { gap: 9, alignItems: "center" },
  flightDateNavigator: { paddingHorizontal: 0 },
  flightDates: { paddingHorizontal: 16 },
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
  flightDate: { minWidth: 96, maxWidth: 116 },
  dateActive: { borderColor: ui.blue, backgroundColor: "#F5F8FF" },
  day: { fontSize: 12, color: ui.muted },
  datePrice: { maxWidth: "100%", fontSize: 16, fontWeight: "800", color: ui.navy, marginTop: 1 },
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
