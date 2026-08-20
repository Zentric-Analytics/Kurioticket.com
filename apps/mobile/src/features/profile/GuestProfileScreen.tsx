import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalization";
import { FlowIcon } from "../flow/FlowIcon";
import { TravelIllustration } from "./TravelIllustration";
import { ProfileCardSection } from "./ProfileCardSection";
import type { ProfileSection } from "./profileModel";
import { AppVersionFooter } from "./AppVersionFooter";
const BLUE = "#0754F7";

export function GuestProfileScreen() {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization();
  const sections: ProfileSection[] = [
    { title: "travelActivity", items: [{ label: "savedRecent", icon: "bookmark", destination: { kind: "native", href: "/saved" } }] },
    { title: "preferences", items: [{ label: "customizationPreferences", icon: "palette", destination: { kind: "native", href: "/settings" } }] },
    { title: "helpSupport", items: [
      { label: "contactSupport", icon: "headset", destination: { kind: "native", href: "/support" } },
      { label: "faq", icon: "help", destination: { kind: "native", href: "/faq" } },
    ] },
    { title: "aboutLegal", items: [
      { label: "terms", icon: "document", destination: { kind: "external", href: "/terms" } },
      { label: "privacy", icon: "shield", destination: { kind: "external", href: "/privacy" } },
    ] },
  ];
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}><View style={styles.header}><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{t("profile")}</Text></View><View style={styles.illustration}><TravelIllustration /></View><Text accessibilityRole="header" style={[styles.heroTitle, { color: theme.text }]}>{t("guestHeroTitle")}</Text><Text style={[styles.heroBody, { color: theme.muted }]}>{t("guestHeroBody")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("signIn")} accessibilityHint={t("signInHint")} onPress={() => router.push("/(tabs)/profile/sign-in")} style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}><FlowIcon name="person" color="white" size={24} /><Text style={styles.signInText}>{t("signIn")}</Text><View style={styles.signInArrow}><FlowIcon name="chevron" color="white" size={22} /></View></Pressable><View style={styles.sections}>{sections.map(section => <ProfileCardSection key={section.title} section={section} />)}</View><AppVersionFooter /></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, scroll: { paddingHorizontal: 18, paddingBottom: 24 }, header: { minHeight: 70, flexDirection: "row", alignItems: "center" }, title: { fontSize: 30, lineHeight: 38, fontWeight: "800" }, illustration: { height: 192, marginHorizontal: -18, marginTop: -5 }, heroTitle: { textAlign: "center", fontSize: 22, lineHeight: 28, fontWeight: "800", marginTop: -2 }, heroBody: { textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 7 }, signIn: { height: 54, marginTop: 16, borderRadius: 10, backgroundColor: BLUE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 18 }, signInText: { color: "white", fontSize: 16, fontWeight: "700" }, signInArrow: { position: "absolute", right: 17 }, sections: { gap: 15, marginTop: 15 }, pressed: { opacity: .7 } });
