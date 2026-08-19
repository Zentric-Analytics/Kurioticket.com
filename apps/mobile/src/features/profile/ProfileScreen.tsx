import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { travelApi } from "../../api/travelApi";
import { readSession } from "../../storage/sessionStorage";
import { authApi } from "../auth/authApi";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalization";
import { ProfileCardSection } from "./ProfileCardSection";
import { authenticatedProfileSections } from "./profileModel";

function Header({ unreadCount }: { unreadCount: number }) {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization();
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);
  return <View style={styles.header}><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{t("profile")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("notifications")} accessibilityHint={t("notificationsHint")} accessibilityValue={unreadCount ? { text: `${badge} ${t("unread")}` } : undefined} onPress={() => router.push("/notifications")} style={styles.iconButton}><FlowIcon name="bell" size={29} color={theme.icon} />{unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}</Pressable></View>;
}

export function AuthenticatedProfileScreen() {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization(); const [unreadCount, setUnreadCount] = useState(0); const [authenticated, setAuthenticated] = useState(false);
  const load = useCallback(() => { void readSession().then(Boolean).then(setAuthenticated).catch(() => setAuthenticated(false)); void travelApi.notificationUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => undefined); }, []);
  useEffect(load, [load]); useFocusEffect(load);
  const logout = () => Alert.alert(t("logoutConfirm"), t("logoutExplanation"), [{ text: t("cancel"), style: "cancel" }, { text: t("logout"), style: "destructive", onPress: () => void authApi.logout().catch(() => undefined).finally(() => router.replace("/(tabs)/profile")) }]);
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}><ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}><Header unreadCount={unreadCount} />
    <View style={styles.sections}>{authenticatedProfileSections.map(section => <ProfileCardSection key={section.title} section={section} />)}</View>
    {authenticated ? <Pressable accessibilityRole="button" accessibilityLabel={t("logout")} accessibilityHint={t("logoutHint")} onPress={logout} style={({ pressed }) => [styles.logout, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}><FlowIcon name="logout" color={flowColors.red} size={27} /><Text style={styles.logoutText}>{t("logout")}</Text></Pressable> : null}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, scroll: { paddingHorizontal: 18, paddingBottom: 24 }, header: { minHeight: 76, flexDirection: "row", alignItems: "center" }, title: { flex: 1, fontSize: 30, lineHeight: 38, fontWeight: "800" }, iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, badge: { position: "absolute", right: 0, top: 2, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: "#D92D20", alignItems: "center", justifyContent: "center" }, badgeText: { color: "white", fontSize: 10, fontWeight: "800" }, sections: { gap: 14 }, logout: { minHeight: 64, marginTop: 20, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, elevation: 2 }, logoutText: { color: flowColors.red, fontSize: 16, fontWeight: "800" }, pressed: { opacity: .68 } });
