import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getRuntimeEnvironment } from "../../config/environment";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { FlowIcon } from "../flow/FlowIcon";
import type { ProfileDestination, ProfileSection } from "./profileModel";
import { navigateProfileDestination, openPreviewLegalBrowser } from "./profileNavigation";

async function openPreviewBrowser(url: string) {
  const WebBrowser = await import("expo-web-browser");
  return openPreviewLegalBrowser(url, Platform.OS, WebBrowser);
}

async function openProfileDestination(destination: ProfileDestination) {
  await navigateProfileDestination(destination, getRuntimeEnvironment(), {
    push: (href) => router.push(href),
    openBrowser: openPreviewBrowser,
  });
}

export function ProfileCardSection({ section }: { section: ProfileSection }) {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization();
  return <View accessibilityRole="summary" style={[styles.card, { backgroundColor: theme.dark ? theme.surface : "#FAFAFA", borderColor: theme.dark ? theme.border : "#EEEEEE" }]}>
    <View style={[styles.heading, { borderBottomColor: theme.dark ? theme.border : "#EEEEEE" }]}><Text accessibilityRole="header" style={[styles.headingText, { color: theme.dark ? theme.text : "#1A1A1A" }]}>{t(section.title)}</Text></View>
    {section.items.map((item, index) => { const label = t(item.label); const destination = item.destination; return <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={label} onPress={() => { void openProfileDestination(destination); }} style={({ pressed }) => [styles.row, index < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.dark ? theme.border : "#EEEEEE" }, pressed && styles.pressed]}>
      <View style={styles.icon}><FlowIcon strokeWidth={1.3} name={item.icon} color={theme.dark ? theme.icon : "#1A1A1A"} size={24} /></View><Text style={[styles.label, { color: theme.dark ? theme.text : "#1A1A1A" }]}>{label}</Text><FlowIcon strokeWidth={1.3} name="chevron" color={theme.dark ? theme.muted : "#A2A2A2"} size={18} />
    </Pressable>; })}
  </View>;
}
const styles = StyleSheet.create({ card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: "hidden" }, heading: { minHeight: 44, justifyContent: "center", paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth }, headingText: { fontSize: 15, lineHeight: 20, fontWeight: "700" }, row: { minHeight: 54, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 }, icon: { width: 28, alignItems: "flex-start" }, label: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, fontWeight: "500" }, pressed: { opacity: .7 } });
