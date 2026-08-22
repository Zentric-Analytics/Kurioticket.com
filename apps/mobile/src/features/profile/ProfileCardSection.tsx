import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import type { ProfileSection } from "./profileModel";
import { getApiBaseUrl } from "../../config/apiUrl";

async function openExternal(path: "/terms" | "/privacy", label: string) {
  try { const base = getApiBaseUrl(); if (!base.ok) throw new Error("configuration"); const url = new URL(path, `${base.baseUrl}/`).toString(); if (!await Linking.canOpenURL(url)) throw new Error("unsupported"); await Linking.openURL(url); }
  catch { Alert.alert(`Unable to open ${label}`, "Check your connection and try again."); }
}

export function ProfileCardSection({ section }: { section: ProfileSection }) {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization();
  return <View accessibilityRole="summary" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View style={[styles.heading, { borderBottomColor: theme.border }]}><Text accessibilityRole="header" style={[styles.headingText, { color: theme.text }]}>{t(section.title)}</Text></View>
    {section.items.map((item, index) => { const label = t(item.label); const destination = item.destination; const external = destination.kind === "external"; return <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={external ? t("externalLinkHint") : undefined} onPress={() => destination.kind === "external" ? void openExternal(destination.href, label) : router.push(destination.href)} style={({ pressed }) => [styles.row, index < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }, pressed && styles.pressed]}>
      <View style={styles.icon}><FlowIcon name={item.icon} color={flowColors.blue} size={24} /></View><Text style={[styles.label, { color: theme.text }]}>{label}</Text><FlowIcon name={external ? "external" : "chevron"} color={theme.muted} size={18} />
    </Pressable>; })}
  </View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 14, overflow: "hidden", shadowColor: "#18305B", shadowOpacity: .06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, heading: { minHeight: 48, justifyContent: "center", paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth }, headingText: { fontSize: 16, lineHeight: 22, fontWeight: "800" }, row: { minHeight: 58, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }, icon: { width: 30, alignItems: "flex-start" }, label: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontWeight: "700" }, pressed: { opacity: .7 } });
