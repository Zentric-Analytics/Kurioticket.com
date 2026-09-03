import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { travelApi } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { profileWelcomeGreeting } from "../../localization/profileGreetingCopy";
import { peekProfileName, readProfileName, writeProfileName } from "../../storage/profileNameCache";
import { readSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { authApi } from "../auth/authApi";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { AppVersionFooter } from "./AppVersionFooter";
import { ProfileCardSection } from "./ProfileCardSection";
import { authenticatedProfileSections, profileFirstName } from "./profileModel";
import { subscribeUnreadCountChanged } from "../notifications/notificationUnreadRefresh";

function Header({ unreadCount }: { unreadCount: number }) {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization();
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);
  return <View style={styles.header}><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{t("profile")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("notifications")} accessibilityHint={t("notificationsHint")} accessibilityValue={unreadCount ? { text: `${badge} ${t("unread")}` } : undefined} onPress={() => router.push("/notifications")} style={styles.iconButton}><FlowIcon name="bell" size={29} color={theme.icon} />{unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}</Pressable></View>;
}

function WelcomeCard({ name, email }: { name: string | null; email: string | null }) {
  const { theme } = useAppTheme(); const { t, locale } = useMobileLocalization();
  const firstName = profileFirstName(name);
  const greeting = firstName ? `${t("profileGreeting")}, ${firstName} 👋` : `${profileWelcomeGreeting(locale)} 👋`;
  const accessibilityCopy = [greeting, email, t("profileWelcomeLine")].filter(Boolean).join(". ");
  return <View accessibilityRole="summary" accessibilityLabel={accessibilityCopy} style={styles.welcomeCard}>
    <View style={[styles.avatar, { backgroundColor: theme.dark ? "#24699C" : "#1769AA" }]}>{firstName ? <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text> : <FlowIcon name="person" size={25} color="#FFFFFF" />}</View>
    <View style={styles.welcomeCopy}>
      <Text numberOfLines={1} style={[styles.greeting, { color: theme.text }]}>{greeting}</Text>
      {email ? <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.welcomeEmail, { color: theme.muted }]}>{email}</Text> : null}
      <Text numberOfLines={1} style={[styles.welcomeLine, { color: theme.muted }]}>{t("profileWelcomeLine")}</Text>
    </View>
  </View>;
}

export function AuthenticatedProfileScreen() {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization(); const [unreadCount, setUnreadCount] = useState(0); const [authenticated, setAuthenticated] = useState(false); const [name, setName] = useState<string | null>(null); const [email, setEmail] = useState<string | null>(null); const loadGeneration = useRef(0);
  const load = useCallback(() => {
    const generation = ++loadGeneration.current;
    void readSession().then(session => {
      if (generation !== loadGeneration.current) return;
      setAuthenticated(Boolean(session));
      setEmail(session?.user.email ?? null);
      if (!session) { setName(null); return; }
      const userId = session.user.id;
      const memoryName = peekProfileName(userId);
      if (memoryName !== undefined) setName(memoryName);
      void readProfileName(userId).then(cachedName => {
        if (generation === loadGeneration.current) setName(cachedName);
      }).catch(() => undefined);
      void travelApi.profile().then(({ profile, user }) => {
        if (generation !== loadGeneration.current) return;
        const authoritativeName = profile?.fullName?.trim() || null;
        setName(authoritativeName);
        setEmail(user.email || session.user.email || null);
        void writeProfileName(userId, authoritativeName).catch(() => undefined);
      }).catch(() => undefined);
    }).catch(() => {
      if (generation !== loadGeneration.current) return;
      setAuthenticated(false);
      setName(null);
      setEmail(null);
    });
    void travelApi.notificationUnreadCount().then(({ count }) => {
      if (generation === loadGeneration.current) setUnreadCount(count);
    }).catch(() => undefined);
  }, []);
  useFocusEffect(load);
  useEffect(() => {
    const unsubscribe = subscribeUnreadCountChanged(load);
    const appState = AppState.addEventListener("change", state => { if (state === "active") load(); });
    return () => { unsubscribe(); appState.remove(); };
  }, [load]);
  const logout = () => Alert.alert(t("logoutConfirm"), t("logoutExplanation"), [{ text: t("cancel"), style: "cancel" }, { text: t("logout"), style: "destructive", onPress: () => void authApi.logout().catch(() => undefined).finally(() => router.replace("/(tabs)/profile")) }]);
  const [manageAccount, ...remainingSections] = authenticatedProfileSections;
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}><ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    <View style={[styles.hero, { backgroundColor: theme.dark ? "#102B4A" : "#F3F8FF" }]}>
      <Header unreadCount={unreadCount} />
      <WelcomeCard name={name} email={email} />
    </View>
    <View style={styles.manageAccountOverlap}><ProfileCardSection section={manageAccount} /></View>
    <View style={styles.sections}>{remainingSections.map(section => <ProfileCardSection key={section.title} section={section} />)}</View>
    {authenticated ? <Pressable accessibilityRole="button" accessibilityLabel={t("logout")} accessibilityHint={t("logoutHint")} onPress={logout} style={({ pressed }) => [styles.logout, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}><FlowIcon name="logout" color={flowColors.red} size={27} /><Text style={styles.logoutText}>{t("logout")}</Text></Pressable> : null}
    <AppVersionFooter />
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, scroll: { paddingHorizontal: 18, paddingBottom: 24 }, hero: { marginHorizontal: -18, paddingHorizontal: 18, paddingBottom: 38, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }, header: { minHeight: 72, flexDirection: "row", alignItems: "center" }, title: { flex: 1, fontSize: 30, lineHeight: 38, fontWeight: "800" }, iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, badge: { position: "absolute", right: 0, top: 2, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: "#D92D20", alignItems: "center", justifyContent: "center" }, badgeText: { color: "white", fontSize: 10, fontWeight: "800" }, welcomeCard: { minHeight: 94, paddingHorizontal: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center" }, avatar: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", marginRight: 14 }, avatarText: { color: "#FFFFFF", fontSize: 22, lineHeight: 27, fontWeight: "800" }, welcomeCopy: { flex: 1, minWidth: 0 }, greeting: { fontSize: 19, lineHeight: 24, fontWeight: "800" }, welcomeEmail: { fontSize: 12, lineHeight: 17, marginTop: 1, fontWeight: "500" }, welcomeLine: { fontSize: 13, lineHeight: 18, marginTop: 1, fontWeight: "500" }, manageAccountOverlap: { marginTop: -28, zIndex: 1 }, sections: { gap: 18, marginTop: 18 }, logout: { minHeight: 56, marginTop: 22, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, logoutText: { color: flowColors.red, fontSize: 16, fontWeight: "700" }, pressed: { opacity: .68 } });
