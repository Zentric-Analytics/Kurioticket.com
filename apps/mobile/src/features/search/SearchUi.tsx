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
  type DateStripPrice,
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
  priceByDate,
  currency = "USD",
  flightResults = false,
  onSelect,
}: {
  date: string;
  priceByDate: Record<string, DateStripPrice>;
  currency?: string;
  flightResults?: boolean;
  onSelect: (v: string) => void;
}) {
  const { theme } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  // Keep three dates fully visible while letting the narrower fourth tile peek into view.
  const flightDateWidth = Math.min(96, Math.max(76, (windowWidth - 43) / 3.65));
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
        style={[s.dateRail, flightResults && s.flightDateRail]}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.dates, flightResults && s.flightDates]}
      >
        {visibleDates.map((iso) => {
          const x = parseCalendarDate(iso);
          const active = iso === date;
          const price = priceByDate[iso];
          const hasPrice = price != null;
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(iso)}
              hitSlop={flightResults ? 6 : undefined}
              style={({ pressed }) => [
                s.date,
                flightResults && s.flightDate,
                flightResults && { width: flightDateWidth },
                flightResults && {
                  backgroundColor: theme.surface,
                  shadowColor: theme.dark ? "#000000" : "#18305B",
                  shadowOpacity: theme.dark ? 0.28 : 0.1,
                },
                !flightResults && active && s.dateActive,
                flightResults && active && {
                  backgroundColor: theme.dark ? "#142B55" : "#F0F5FF",
                  shadowOpacity: theme.dark ? 0.34 : 0.15,
                  elevation: 5,
                },
                pressed && s.datePressed,
              ]}
            >
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
              {hasPrice || flightResults ? (
                <Text
                  accessibilityLabel={price?.accessibilityLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={flightResults ? 0.78 : 0.85}
                  style={[
                    s.datePrice,
                    flightResults && s.flightDatePrice,
                    flightResults && { color: theme.textPrimary },
                    active && { color: theme.dark ? "#8FB5FF" : ui.blue },
                  ]}
                >
                  {hasPrice
                    ? (price.formatted ?? money(currency, price.amount))
                    : ""}
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
  flightDateNavigator: { height: 80, paddingHorizontal: 0 },
  flightDateRail: { height: 80 },
  flightDates: { paddingHorizontal: 16, paddingVertical: 7 },
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
    height: 50,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: 0,
    shadowColor: "#18305B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  dateActive: { borderColor: ui.blue, backgroundColor: "#F5F8FF" },
  datePressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  day: { fontSize: 12, lineHeight: 16, color: ui.muted },
  datePrice: { maxWidth: "100%", fontSize: 16, fontWeight: "800", color: ui.navy, marginTop: 1 },
  flightDateWeekday: { width: "100%", fontSize: 12, fontWeight: "500", lineHeight: 14, letterSpacing: 0.1, textAlign: "center" },
  flightDateLabel: { width: "100%", fontSize: 13, fontWeight: "600", lineHeight: 15, letterSpacing: -0.1, textAlign: "center" },
  flightDatePrice: { width: "100%", height: 17, fontSize: 15, fontWeight: "700", textAlign: "center", lineHeight: 17, paddingHorizontal: 1 },
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
