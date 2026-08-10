import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { readCurrency } from "../../storage/preferenceStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { TravelIllustration } from "./TravelIllustration";

const BLUE = "#0754F7";
const TERMS = "https://kurioticket.com/terms";
const PRIVACY = "https://kurioticket.com/privacy";

type Row = { title: string; description?: string; icon: FlowIconName; value?: string; action: () => void };
function unavailable(name: string) { Alert.alert(name, `${name} is not available in this version of Kurioticket.`); }
async function openUrl(url: string, label: string) {
  try { await Linking.openURL(url); } catch { Alert.alert(`Unable to open ${label}`, "Check your connection and try again."); }
}

function GuestRow({ row, last }: { row: Row; last: boolean }) {
  const { theme } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}${row.value ? `, ${row.value}` : ""}`} onPress={row.action} style={({ pressed }) => [styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }, pressed && styles.pressed]}>
    <View style={styles.rowIcon}><FlowIcon name={row.icon} color={BLUE} size={24} /></View><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: theme.text }]}>{row.title}</Text>{row.description ? <Text style={[styles.rowDescription, { color: theme.muted }]}>{row.description}</Text> : null}</View>{row.value ? <Text style={[styles.value, { color: theme.muted }]}>{row.value}</Text> : null}<FlowIcon name="chevron" color={theme.icon} size={18} />
  </Pressable>;
}
function Section({ title, rows, children }: { title: string; rows?: Row[]; children?: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <View style={styles.section}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text><View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>{rows?.map((row, index) => <GuestRow key={row.title} row={row} last={index === rows.length - 1} />)}{children}</View></View>;
}

export function GuestProfileScreen() {
  const { theme, darkMode, setDarkMode } = useAppTheme();
  const [currency, setCurrency] = useState("USD");
  const loadCurrency = useCallback(() => { void readCurrency().then(setCurrency).catch(() => undefined); }, []);
  useEffect(loadCurrency, [loadCurrency]); useFocusEffect(loadCurrency);
  const support: Row[] = [
    { title: "Help center", description: "Find answers to common questions", icon: "help", action: () => unavailable("Help center") },
    { title: "Contact us", description: "Get in touch with our support team", icon: "headset", action: () => unavailable("Contact us") },
    { title: "Terms of Service", description: "Read our terms and conditions", icon: "document", action: () => void openUrl(TERMS, "Terms of Service") },
    { title: "Privacy Policy", description: "Learn how we protect your data", icon: "shield", action: () => void openUrl(PRIVACY, "Privacy Policy") },
  ];
  const saved: Row[] = [
    { title: "Saved & Recent", description: "Sign in to view saved favorites", icon: "heart", action: () => router.push("/saved") },
  ];
  const appSettings: Row[] = [
    { title: "Language", icon: "globe", value: "English", action: () => unavailable("Language selection") },
    { title: "Currency", icon: "currency", value: currency, action: () => router.push("/currency") },
  ];
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    <View style={styles.header}><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Profile</Text><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}><FlowIcon name="bell" color={theme.icon} size={28} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={styles.iconButton}><FlowIcon name="settings" color={theme.icon} size={29} /></Pressable></View>
    <View style={styles.illustration}><TravelIllustration /></View>
    <Text accessibilityRole="header" style={[styles.heroTitle, { color: theme.text }]}>Your journey starts here</Text>
    <Text style={[styles.heroBody, { color: theme.muted }]}>Sign in to access your trips, saved items,{"\n"}price alerts and personalized recommendations.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Sign in" accessibilityHint="Choose an authentication method" onPress={() => router.push("/(tabs)/profile/sign-in")} style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}><FlowIcon name="person" color="white" size={24} /><Text style={styles.signInText}>Sign in</Text><View style={styles.signInArrow}><FlowIcon name="chevron" color="white" size={22} /></View></Pressable>
    <Section title="Your travel" rows={saved} />
    <Section title="Support" rows={support} />
    <Section title="App settings">
      {appSettings.map((row) => <GuestRow key={row.title} row={row} last={false} />)}
      <View style={styles.row}><View style={styles.rowIcon}><FlowIcon name="moon" color={BLUE} size={25} /></View><Text style={[styles.rowTitle, styles.rowCopy, { color: theme.text }]}>Dark mode</Text><Switch accessibilityLabel="Dark mode" value={darkMode} onValueChange={(enabled) => void setDarkMode(enabled).catch(() => Alert.alert("Unable to update dark mode", "Please try again."))} trackColor={{ false: "#DDE2EE", true: BLUE }} thumbColor="white" /></View>
    </Section>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, scroll: { paddingHorizontal: 18, paddingBottom: 24 }, header: { minHeight: 70, flexDirection: "row", alignItems: "center" }, title: { flex: 1, fontSize: 30, lineHeight: 38, fontWeight: "800" }, iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  illustration: { height: 192, marginHorizontal: -18, marginTop: -5 }, heroTitle: { textAlign: "center", fontSize: 22, lineHeight: 28, fontWeight: "800", marginTop: -2 }, heroBody: { textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 7 },
  signIn: { height: 54, marginTop: 16, borderRadius: 10, backgroundColor: BLUE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 18 }, signInText: { color: "white", fontSize: 16, fontWeight: "700" }, signInArrow: { position: "absolute", right: 17 },
  section: { gap: 8, marginTop: 15 }, sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: "800" }, card: { borderWidth: 1, borderRadius: 14, overflow: "hidden", shadowColor: "#18305B", shadowOpacity: .06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  row: { minHeight: 58, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }, rowIcon: { width: 30 }, rowCopy: { flex: 1 }, rowTitle: { fontSize: 13, lineHeight: 18, fontWeight: "700" }, rowDescription: { fontSize: 11, lineHeight: 15 }, value: { fontSize: 12 }, pressed: { opacity: .7 },
});
