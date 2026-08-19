import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalization";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import type { ProfileSection } from "./profileModel";

async function openExternal(url: string, label: string) {
  try { if (!await Linking.canOpenURL(url)) throw new Error("unsupported"); await Linking.openURL(url); }
  catch { Alert.alert(`Unable to open ${label}`, "Check your connection and try again."); }
}

export function ProfileCardSection({ section }: { section: ProfileSection }) {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization();
  return <View accessibilityRole="summary" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View style={[styles.heading, { borderBottomColor: theme.border }]}><Text accessibilityRole="header" style={[styles.headingText, { color: theme.text }]}>{t(section.title)}</Text></View>
    {section.items.map((item, index) => { const label = t(item.label); const external = item.destination.kind === "external"; return <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={external ? t("externalLinkHint") : undefined} onPress={() => external ? void openExternal(item.destination.href, label) : router.push(item.destination.href)} style={({ pressed }) => [styles.row, index < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }, pressed && styles.pressed]}>
      <View style={styles.icon}><FlowIcon name={item.icon} color={flowColors.blue} size={25} /></View><Text style={[styles.label, { color: theme.text }]}>{label}</Text><FlowIcon name="chevron" color={theme.muted} size={20} />
    </Pressable>; })}
  </View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 17, overflow: "hidden", shadowColor: "#18305B", shadowOpacity: .07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, heading: { minHeight: 66, justifyContent: "center", paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth }, headingText: { fontSize: 23, lineHeight: 29, fontWeight: "800" }, row: { minHeight: 68, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", gap: 13 }, icon: { width: 30, alignItems: "flex-start" }, label: { flex: 1, minWidth: 0, fontSize: 17, lineHeight: 23, fontWeight: "600" }, pressed: { opacity: .68 } });
