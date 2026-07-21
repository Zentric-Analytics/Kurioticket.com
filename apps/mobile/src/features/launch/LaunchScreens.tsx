import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Logo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { colors, spacing } from "../../theme/tokens";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";
import type { ConfigResponse } from "../../api/mobileApi";

const TERMS_URL = "https://kurioticket.com/terms";
const PRIVACY_URL = "https://kurioticket.com/privacy";

type MobileConfig = ConfigResponse["data"] | undefined;

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{label}</Text></Pressable>;
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondary}><Text style={styles.secondaryText}>{label}</Text></Pressable>;
}

function LegalLink({ label, url }: { label: string; url: string }) {
  return <Text accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={styles.link}>{label}</Text>;
}

export function LoadingScreen() {
  return <Screen centered><Logo /><Text style={styles.body}>Preparing Kurioticket.</Text></Screen>;
}

export function OnboardingScreen({ onGuest }: { onGuest: () => void }) {
  async function continueGuest() {
    await writeOnboardingCompleted();
    onGuest();
  }

  return (
    <Screen>
      <Logo />
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Flights first</Text>
        <Text style={styles.title}>Plan smarter trips with Kurioticket.</Text>
        <Text style={styles.body}>Compare real flight options, then save trips and searches after signing in. Approved email and in-app price alerts help you keep track of fares.</Text>
        <View style={styles.list}>
          <Text style={styles.item}>• Compare flight options clearly</Text>
          <Text style={styles.item}>• Save trips and searches with an account</Text>
          <Text style={styles.item}>• Receive approved price alerts</Text>
        </View>
        <PrimaryButton label="Continue with email" onPress={() => router.push("/email-auth")} />
        <SecondaryButton label="Continue as guest" onPress={continueGuest} />
        <Text style={styles.legal}>By continuing, you agree to Kurioticket’s <LegalLink label="Terms of Service" url={TERMS_URL} /> and <LegalLink label="Privacy Policy" url={PRIVACY_URL} />.</Text>
      </View>
    </Screen>
  );
}

export function GuestAppScreen({ config }: { config?: MobileConfig }) {
  const flightsEnabled = config?.features.flights !== false;

  return (
    <Screen>
      <Logo compact />
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Kurioticket mobile</Text>
        <Text style={styles.title}>Flight search is your starting point.</Text>
        <Text style={styles.body}>Kurioticket mobile is focused on flight comparison first, with account-backed saved trips, searches, and alerts aligned to the approved launch path.</Text>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Flight search</Text>
          <Text style={styles.item}>{flightsEnabled ? "Use this stable app entry while the full repository-grounded mobile flight search is connected in the next flight milestone." : "Flight search is temporarily unavailable. You can still open account access or retry later."}</Text>
        </View>
        <PrimaryButton label="Account access" onPress={() => router.push("/email-auth")} />
      </View>
    </Screen>
  );
}

export function ReservedEmailAuthScreen() {
  return (
    <Screen centered>
      <Logo compact />
      <View style={styles.card}>
        <Text style={styles.title}>Email account access</Text>
        <Text style={styles.body}>Native email sign-in is the next approved mobile milestone. For now, you can continue using Kurioticket as a guest.</Text>
        <SecondaryButton label="Back to Kurioticket" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}

export function RecoveryScreen({ type, onRetry }: { type: "offline" | "configuration"; onRetry: () => void }) {
  return (
    <Screen centered>
      <Logo compact />
      <View style={styles.card}>
        <Text style={styles.title}>{type === "offline" ? "Kurioticket is having trouble connecting." : "Kurioticket is unavailable right now."}</Text>
        <Text style={styles.body}>{type === "offline" ? "Check your connection and try again." : "Please try again in a moment."}</Text>
        <PrimaryButton label="Retry" onPress={onRetry} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: spacing.radius, padding: spacing.card, gap: 16 },
  eyebrow: { color: colors.teal, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  title: { color: colors.navy, fontSize: 30, lineHeight: 36, fontWeight: "900", letterSpacing: -0.4 },
  body: { color: colors.slate, fontSize: 16, lineHeight: 24 },
  list: { gap: 8 },
  item: { color: colors.navy, fontSize: 15, lineHeight: 22 },
  primary: { backgroundColor: colors.blue, borderRadius: 18, padding: 16, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },
  secondary: { backgroundColor: colors.sky, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, alignItems: "center" },
  secondaryText: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  legal: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  link: { color: colors.blue, fontWeight: "800" },
  panel: { backgroundColor: colors.background, borderRadius: 18, padding: 16, gap: 8 },
  panelTitle: { color: colors.navy, fontWeight: "900", fontSize: 16 },
});
