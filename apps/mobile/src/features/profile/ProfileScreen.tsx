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
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { ProfileCardSection } from "./ProfileCardSection";
import { authenticatedProfileSections, profileFirstName } from "./profileModel";
import { AppVersionFooter } from "./AppVersionFooter";

function Header({ unreadCount }: { unreadCount: number }) {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization();
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);
  return <View style={styles.header}><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{t("profile")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("notifications")} accessibilityHint={t("notificationsHint")} accessibilityValue={unreadCount ? { text: `${badge} ${t("unread")}` } : undefined} onPress={() => router.push("/notifications")} style={styles.iconButton}><FlowIcon name="bell" size={29} color={theme.icon} />{unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}</Pressable></View>;
}

function WelcomeCard({ name }: { name: string | null }) {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization();
  const firstName = profileFirstName(name);
  const greeting = firstName ? `${t("profileGreeting")}, ${firstName} 👋` : `${t("profileGreeting")} 👋`;
  return <View accessibilityRole="summary" accessibilityLabel={`${greeting}. ${t("profileWelcomeLine")}`} style={[styles.welcomeCard, { backgroundColor: theme.dark ? "#102B4A" : "#EDF6FF", borderColor: theme.dark ? "#28577E" : "#CFE5F7" }]}>
    <View pointerEvents="none" style={[styles.welcomeDetail, { borderColor: theme.dark ? "#1E4669" : "#DCECF9" }]} />
    <View style={[styles.avatar, { backgroundColor: theme.dark ? "#24699C" : "#1769AA" }]}>{firstName ? <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text> : <FlowIcon name="person" size={23} color="#FFFFFF" />}</View>
    <View style={styles.welcomeCopy}><Text style={[styles.greeting, { color: theme.text }]}>{greeting}</Text><Text style={[styles.welcomeLine, { color: theme.muted }]}>{t("profileWelcomeLine")}</Text></View>
  </View>;
}

export function AuthenticatedProfileScreen() {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization(); const [unreadCount, setUnreadCount] = useState(0); const [authenticated, setAuthenticated] = useState(false); const [name, setName] = useState<string | null>(null);
  const load = useCallback(() => { void readSession().then(session => { setAuthenticated(Boolean(session)); setName(session?.user.name ?? null); }).catch(() => { setAuthenticated(false); setName(null); }); void travelApi.notificationUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => undefined); }, []);
  useEffect(load, [load]); useFocusEffect(load);
  const logout = () => Alert.alert(t("logoutConfirm"), t("logoutExplanation"), [{ text: t("cancel"), style: "cancel" }, { text: t("logout"), style: "destructive", onPress: () => void authApi.logout().catch(() => undefined).finally(() => router.replace("/(tabs)/profile")) }]);
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}><ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}><Header unreadCount={unreadCount} />
    <WelcomeCard name={name} />
    <View style={styles.sections}>{authenticatedProfileSections.map(section => <ProfileCardSection key={section.title} section={section} />)}</View>
    {authenticated ? <Pressable accessibilityRole="button" accessibilityLabel={t("logout")} accessibilityHint={t("logoutHint")} onPress={logout} style={({ pressed }) => [styles.logout, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}><FlowIcon name="logout" color={flowColors.red} size={27} /><Text style={styles.logoutText}>{t("logout")}</Text></Pressable> : null}
    <AppVersionFooter />
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, scroll: { paddingHorizontal: 18, paddingBottom: 24 }, header: { minHeight: 72, flexDirection: "row", alignItems: "center" }, title: { flex: 1, fontSize: 30, lineHeight: 38, fontWeight: "800" }, iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, badge: { position: "absolute", right: 0, top: 2, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: "#D92D20", alignItems: "center", justifyContent: "center" }, badgeText: { color: "white", fontSize: 10, fontWeight: "800" }, welcomeCard: { minHeight: 104, borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", overflow: "hidden", marginBottom: 22 }, welcomeDetail: { position: "absolute", width: 112, height: 112, borderRadius: 56, borderWidth: 18, right: -40, top: -54, opacity: .7 }, avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginRight: 14 }, avatarText: { color: "#FFFFFF", fontSize: 20, lineHeight: 25, fontWeight: "800" }, welcomeCopy: { flex: 1, minWidth: 0 }, greeting: { fontSize: 20, lineHeight: 26, fontWeight: "800" }, welcomeLine: { fontSize: 13, lineHeight: 19, marginTop: 2, fontWeight: "500" }, sections: { gap: 18 }, logout: { minHeight: 56, marginTop: 22, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, logoutText: { color: flowColors.red, fontSize: 16, fontWeight: "700" }, pressed: { opacity: .68 } });
