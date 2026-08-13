import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { readCurrency } from "../../storage/preferenceStorage";
import { readSession } from "../../storage/sessionStorage";
import { authApi } from "../auth/authApi";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { membershipLabel, profileIdentity } from "./profileModel";
import { useAppTheme } from "../../theme/AppTheme";

type Route = "/personal-information" | "/price-alerts" | "/settings" | "/currency" | "/saved" | "/(tabs)/trips" | "/notifications";
type Row = { title: string; description?: string; icon: FlowIconName; route?: Route; value?: string; action?: () => void };

const TERMS_URL = "https://kurioticket.com/terms";
const PRIVACY_URL = "https://kurioticket.com/privacy";
const HELP_URL = "https://kurioticket.com/faq";
const CONTACT_URL = "https://kurioticket.com/support";

async function openApprovedUrl(url: string, label: string) {
  try {
    if (!await Linking.canOpenURL(url)) throw new Error("unsupported");
    await Linking.openURL(url);
  } catch {
    Alert.alert(`Unable to open ${label}`, "Check your connection and try again.");
  }
}

function Header() {
  const { theme } = useAppTheme();
  return <View style={styles.header}>
    <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Profile</Text>
    <View style={styles.headerActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" accessibilityHint="Opens notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}>
        <FlowIcon name="bell" size={29} color={theme.icon} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Settings" accessibilityHint="Opens app settings" onPress={() => router.push("/settings")} style={styles.iconButton}>
        <FlowIcon name="settings" size={30} color={theme.icon} />
      </Pressable>
    </View>
  </View>;
}

function ProfileSummary({ name, email }: { name: string; email: string }) {
  const identity = profileIdentity({ name, email });
  const { theme } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Personal information, ${identity.name}`} accessibilityHint="Opens your account details" onPress={() => router.push("/personal-information")} style={({ pressed }) => [styles.summary, pressed && styles.pressed]}>
    <View style={styles.avatar}><Text style={styles.avatarText}>{identity.initial}</Text></View>
    <View style={styles.summaryText}>
      <Text numberOfLines={1} style={[styles.userName, { color: theme.text }]}>{identity.name}</Text>
      {identity.email ? <Text numberOfLines={1} style={[styles.email, { color: theme.muted }]}>{identity.email}</Text> : <Text style={[styles.email, { color: theme.muted }]}>Guest traveler</Text>}
      {identity.email ? <View style={[styles.badge, theme.dark && { backgroundColor: theme.surface, borderColor: "#395DA8" }]}><Text style={styles.badgeText}>{membershipLabel()}</Text></View> : null}
    </View>
    <FlowIcon name="chevron" size={22} color={theme.icon} />
  </Pressable>;
}

function ProfileRow({ row, last = false }: { row: Row; last?: boolean }) {
  const { theme } = useAppTheme();
  const content = <>
    <View style={styles.rowIcon}><FlowIcon name={row.icon} color={flowColors.blue} size={26} /></View>
    <View style={styles.rowText}>
      <Text style={[styles.rowTitle, { color: theme.text }]}>{row.title}</Text>
      {row.description ? <Text style={[styles.rowDescription, { color: theme.muted }]}>{row.description}</Text> : null}
    </View>
    {row.value ? <Text style={[styles.rowValue, { color: theme.muted }]}>{row.value}</Text> : null}
    <FlowIcon name="chevron" size={20} color={theme.icon} />
  </>;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}${row.value ? `, ${row.value}` : ""}`} onPress={row.action || (() => row.route && router.push(row.route))} style={({ pressed }) => [styles.row, !last && styles.divider, !last && { borderBottomColor: theme.border }, pressed && styles.pressed]}>{content}</Pressable>;
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  const { theme } = useAppTheme();
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>{rows.map((row, index) => <ProfileRow key={row.title} row={row} last={index === rows.length - 1} />)}</View>
  </View>;
}

export function AuthenticatedProfileScreen() {
  const { theme, darkMode, setDarkMode } = useAppTheme();
  const [identity, setIdentity] = useState(profileIdentity(null));
  const [currency, setCurrency] = useState("USD");
  const load = useCallback(() => {
    void readSession().then((session) => setIdentity(profileIdentity(session?.user || null))).catch(() => setIdentity(profileIdentity(null)));
    void readCurrency().then(setCurrency).catch(() => undefined);
  }, []);
  useEffect(load, [load]);
  useFocusEffect(load);

  const account = useMemo<Row[]>(() => [
    { title: "My Trips", description: "Partner reservations linked to your account", icon: "document", route: "/(tabs)/trips" },
    { title: "Saved & Recent", description: "Saved travel and searches you recently performed", icon: "heart", route: "/saved" },
    { title: "Price Alerts", description: "Automatic and target price tracking", icon: "bell", route: "/price-alerts" },
    { title: "Notifications", description: "Updates from Kurioticket", icon: "bell", route: "/notifications" },
    { title: "Personal information", description: "Update your name, email and more", icon: "person", route: "/personal-information" },
    { title: "Preferences", description: "Manage your app preferences", icon: "sliders", route: "/settings" },
  ], []);
  const support = useMemo<Row[]>(() => [
    { title: "Help center", description: "Find answers to common questions", icon: "help", action: () => void openApprovedUrl(HELP_URL, "Help center") },
    { title: "Contact us", description: "Get in touch with our support team", icon: "headset", action: () => void openApprovedUrl(CONTACT_URL, "Contact us") },
    { title: "Terms of Service", description: "Read our terms and conditions", icon: "document", action: () => void openApprovedUrl(TERMS_URL, "Terms of Service") },
    { title: "Privacy Policy", description: "Learn how we protect your data", icon: "shield", action: () => void openApprovedUrl(PRIVACY_URL, "Privacy Policy") },
  ], []);
  const settings = useMemo<Row[]>(() => [
    { title: "Currency", icon: "currency", value: currency, route: "/currency" },
  ], [currency]);

  const logout = () => Alert.alert("Log out?", "You will be signed out of your account.", [
    { text: "Cancel", style: "cancel" },
    { text: "Log out", style: "destructive", onPress: () => void authApi.logout().then(() => router.replace("/email-auth")).catch(() => Alert.alert("Unable to log out", "Please try again.")) },
  ]);

  const toggleDarkMode = (enabled: boolean) => {
    void setDarkMode(enabled).catch(() => Alert.alert("Unable to update dark mode", "Your previous appearance setting was restored. Please try again."));
  };

  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <Header />
      <ProfileSummary name={identity.name} email={identity.email} />
      <Section title="Account" rows={account} />
      <Section title="Support" rows={support} />
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>App settings</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {settings.map((row) => <ProfileRow key={row.title} row={row} />)}
          <View style={styles.row}>
            <View style={styles.rowIcon}><FlowIcon name="moon" color={flowColors.blue} size={27} /></View>
            <Text style={[styles.rowTitle, styles.rowText, { color: theme.text }]}>Dark mode</Text>
            <Switch accessibilityLabel="Dark mode" accessibilityRole="switch" accessibilityState={{ checked: darkMode }} value={darkMode} onValueChange={toggleDarkMode} trackColor={{ false: "#DDE2EE", true: flowColors.blue }} thumbColor="#FFFFFF" />
          </View>
        </View>
      </View>
      {identity.email ? <Pressable accessibilityRole="button" accessibilityLabel="Log out" accessibilityHint="Opens a sign out confirmation" onPress={logout} style={({ pressed }) => [styles.logout, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}>
        <FlowIcon name="logout" color={flowColors.red} size={27} /><Text style={styles.logoutText}>Log out</Text>
      </Pressable> : null}
      {identity.email ? <Text style={[styles.logoutHelp, { color: theme.muted }]}>You will be signed out of your account</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFBFF" },
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  header: { minHeight: 76, flexDirection: "row", alignItems: "center" },
  title: { flex: 1, color: flowColors.navy, fontSize: 30, lineHeight: 38, fontWeight: "800" },
  headerActions: { flexDirection: "row", gap: 4 },
  iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  summary: { minHeight: 130, flexDirection: "row", alignItems: "center", gap: 18, paddingBottom: 8 },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: "#E3E7FF", alignItems: "center", justifyContent: "center" },
  avatarText: { color: flowColors.blue, fontSize: 36, lineHeight: 44, fontWeight: "700" },
  summaryText: { flex: 1, minWidth: 0, gap: 2 },
  userName: { color: flowColors.navy, fontSize: 20, lineHeight: 26, fontWeight: "800" },
  email: { color: flowColors.muted, fontSize: 14, lineHeight: 20 },
  badge: { alignSelf: "flex-start", marginTop: 5, borderWidth: 1, borderColor: "#CFDAFA", borderRadius: 14, paddingHorizontal: 9, paddingVertical: 2 },
  badgeText: { color: flowColors.blue, fontSize: 11, lineHeight: 15 },
  section: { gap: 9, marginTop: 14 },
  sectionTitle: { color: flowColors.navy, fontSize: 17, lineHeight: 23, fontWeight: "800", marginLeft: 2 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#EDF0F7", borderWidth: 1, borderRadius: 17, overflow: "hidden", shadowColor: "#18305B", shadowOpacity: .06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  row: { minHeight: 74, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 12 },
  divider: { borderBottomColor: "#E9EDF5", borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, alignItems: "flex-start" },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { color: flowColors.navy, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  rowDescription: { color: flowColors.muted, fontSize: 12, lineHeight: 17 },
  rowValue: { color: flowColors.muted, fontSize: 13, lineHeight: 18 },
  logout: { minHeight: 64, marginTop: 20, borderRadius: 17, borderWidth: 1, borderColor: "#EDF0F7", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, elevation: 2 },
  logoutText: { color: flowColors.red, fontSize: 16, fontWeight: "800" },
  logoutHelp: { color: flowColors.muted, textAlign: "center", fontSize: 11, lineHeight: 16, marginTop: 7 },
  pressed: { opacity: .68 },
});
