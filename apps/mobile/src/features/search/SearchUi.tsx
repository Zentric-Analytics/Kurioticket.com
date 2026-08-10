import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";

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
export function TopBar({ detail = false, saved = false, onFavorite, onShare }: { detail?: boolean; saved?: boolean; onFavorite?: () => void; onShare?: () => void }) {
  return (
    <View style={s.top}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={s.hit}
      >
        <FlowIcon name="back" size={25} />
      </Pressable>
      <View pointerEvents="none" style={s.logoCenter}>
        <Logo />
      </View>
      <View style={s.topActions}>
        {detail ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel={saved ? "Remove saved flight" : "Save flight"} accessibilityState={{ selected: saved }} onPress={onFavorite} style={s.hit}><FlowIcon name="heart" fill={saved ? ui.blue : "none"} color={saved ? ui.blue : ui.navy} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Share flight" onPress={onShare} style={s.hit}><FlowIcon name="share" /></Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Price alerts"
            onPress={() => router.push("/price-alerts")}
            style={({ pressed }) => [s.alertHit, pressed && s.pressed]}
          >
            <FlowIcon name="bell" />
            <View style={s.dot} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function Pill({
  label,
  active = false,
  icon,
  onPress,
}: {
  label: string;
  active?: boolean;
  icon?: FlowIconName;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[s.pill, active && s.pillActive]}
    >
      {icon ? (
        <FlowIcon name={icon} size={15} color={active ? ui.blue : ui.navy} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[s.pillText, active && { color: ui.blue }]}
      >
        {label}
      </Text>
      {!icon ? (
        <FlowIcon name="chevron" size={12} color={active ? ui.blue : ui.navy} />
      ) : null}
    </Pressable>
  );
}
export function DateStrip({
  date,
  prices,
  currency = "USD",
  onSelect,
  onPrevious,
  onNext,
}: {
  date: string;
  prices: (number | undefined)[];
  currency?: string;
  onSelect: (v: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const base = new Date(`${date}T12:00:00`);
  return (
    <ScrollView
      horizontal
      style={s.dateRail}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.dates}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Previous date" onPress={onPrevious} disabled={!onPrevious} style={s.arrow}>
        <FlowIcon name="back" size={20} />
      </Pressable>
      {[-2, -1, 0, 1, 2].map((d, i) => {
        const x = new Date(base);
        x.setDate(x.getDate() + d);
        const iso = x.toISOString().slice(0, 10);
        const active = d === 0;
        return (
          <Pressable
            key={iso}
            onPress={() => onSelect(iso)}
            style={[s.date, active && s.dateActive]}
          >
            <Text style={s.day}>
              {x.toLocaleDateString("en-US", { weekday: "short" })}
            </Text>
            <Text
              style={[s.day, active && { color: ui.blue, fontWeight: "800" }]}
            >
              {shortDate(iso)}
            </Text>
            {prices[i] != null ? (
              <Text style={[s.datePrice, active && { color: ui.blue }]}>
                {money(currency, prices[i])}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="Next date" onPress={onNext} disabled={!onNext} style={s.arrow}>
        <FlowIcon name="chevron" size={20} />
      </Pressable>
    </ScrollView>
  );
}
export function Button({
  label,
  outline = false,
  onPress,
  disabled = false,
  external = false,
}: {
  label: string;
  outline?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  external?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, outline && s.outline, disabled && { opacity: 0.45 }]}
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
}: {
  children: React.ReactNode;
  green?: boolean;
}) {
  return (
    <View style={[s.badge, green && { backgroundColor: "#EAF8ED" }]}>
      <Text style={[s.badgeText, green && { color: ui.green }]}>
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
}: {
  title: string;
  body: string;
  retry?: () => void;
  retryLabel?: string;
  edit: () => void;
}) {
  return (
    <View style={s.empty}>
      <FlowIcon name="search" size={38} color={ui.blue} />
      <Text style={s.h2}>{title}</Text>
      <Text style={s.meta}>{body}</Text>
      {retry ? <Button label={retryLabel} onPress={retry} /> : null}
      <Button label="Edit search" outline onPress={edit} />
    </View>
  );
}
export const s = StyleSheet.create({
  logo: { width: 142, height: 34 },
  top: {
    height: 82,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
  },
  logoCenter: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topActions: {
    width: 76,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18,
  },
  alertHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.65 },
  dot: {
    position: "absolute",
    right: 7,
    top: 7,
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
  dateRail: { height: 96, flexGrow: 0, flexShrink: 0 },
  dates: { paddingHorizontal: 18, gap: 9, alignItems: "center" },
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
    height: 78,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8EBF1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  dateActive: { borderColor: ui.blue, backgroundColor: "#F5F8FF" },
  day: { fontSize: 12, color: ui.muted },
  datePrice: { fontSize: 16, fontWeight: "800", color: ui.navy, marginTop: 3 },
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
