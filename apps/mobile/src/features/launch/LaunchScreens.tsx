import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Logo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { colors, spacing } from "../../theme/tokens";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";
import type { ConfigResponse } from "../../api/mobileApi";

const TERMS_URL = "https://kurioticket.com/terms";
const PRIVACY_URL = "https://kurioticket.com/privacy";

type MobileConfig = ConfigResponse["data"] | undefined;

type ButtonProps = { label: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string };

function PrimaryButton({ label, onPress, disabled = false, accessibilityLabel }: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles.primary, pressed && !disabled && styles.primaryPressed, disabled && styles.disabled]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled = false, accessibilityLabel }: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles.secondary, pressed && !disabled && styles.secondaryPressed, disabled && styles.disabled]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function BenefitRow({ children }: { children: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.benefitDot} />
      </View>
      <Text style={styles.benefitText}>{children}</Text>
    </View>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  return <Text accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={styles.link}>{label}</Text>;
}

export function LoadingScreen() {
  return <Screen centered><Logo /><Text style={styles.body}>Preparing Kurioticket.</Text></Screen>;
}

export function OnboardingScreen({ onGuest }: { onGuest: () => void }) {
  const [guestPending, setGuestPending] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotionEnabled) => {
        if (!mounted) return;
        if (reduceMotionEnabled) {
          entrance.setValue(1);
          return;
        }
        Animated.timing(entrance, { toValue: 1, duration: 360, useNativeDriver: true }).start();
      })
      .catch(() => entrance.setValue(1));

    return () => { mounted = false; };
  }, [entrance]);

  async function continueGuest() {
    if (guestPending) return;
    setGuestPending(true);
    try {
      await writeOnboardingCompleted();
      onGuest();
    } finally {
      setGuestPending(false);
    }
  }

  const animatedStyle = {
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <Screen>
      <Animated.View style={[styles.onboarding, animatedStyle]}>
        <View style={styles.heroHeader}>
          <Logo />
          <Text style={styles.eyebrow}>Flights first</Text>
          <Text style={styles.title}>Find better flights. Travel with confidence.</Text>
          <Text style={styles.body}>Compare fares clearly, save the trips that matter, and keep an eye on price changes as Kurioticket grows.</Text>
        </View>

        <View style={styles.benefits}>
          <BenefitRow>Compare flight options clearly</BenefitRow>
          <BenefitRow>Save trips and searches</BenefitRow>
          <BenefitRow>Track fares with price alerts</BenefitRow>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Continue with email" onPress={() => router.push("/email-auth")} disabled={guestPending} />
          <SecondaryButton label="Continue as guest" onPress={continueGuest} disabled={guestPending} />
        </View>

        <Text style={styles.legal}>By continuing, you agree to Kurioticket’s <LegalLink label="Terms of Service" url={TERMS_URL} /> and <LegalLink label="Privacy Policy" url={PRIVACY_URL} />.</Text>
      </Animated.View>
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
        <Text style={styles.titleSmall}>Flight search is your starting point.</Text>
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
        <Text style={styles.titleSmall}>Email account access</Text>
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
        <Text style={styles.titleSmall}>{type === "offline" ? "Kurioticket is having trouble connecting." : "Kurioticket is unavailable right now."}</Text>
        <Text style={styles.body}>{type === "offline" ? "Check your connection and try again." : "Please try again in a moment."}</Text>
        <PrimaryButton label="Retry" onPress={onRetry} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  onboarding: { flex: 1, justifyContent: "space-between", gap: 28, paddingVertical: 6 },
  heroHeader: { alignItems: "center", gap: 14 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: spacing.radius, padding: spacing.card, gap: 16 },
  eyebrow: { color: colors.teal, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, fontSize: 12 },
  title: { color: colors.navy, fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -0.6, textAlign: "center" },
  titleSmall: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.4 },
  body: { color: colors.slate, fontSize: 16, lineHeight: 24, textAlign: "center" },
  benefits: { gap: 12, backgroundColor: colors.surface, borderRadius: 24, padding: 16 },
  benefitRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky },
  benefitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  benefitText: { flex: 1, color: colors.navy, fontSize: 16, lineHeight: 22, fontWeight: "700" },
  actions: { gap: 12 },
  button: { minHeight: 54, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  primary: { backgroundColor: colors.blue },
  primaryPressed: { backgroundColor: colors.navy, transform: [{ scale: 0.99 }] },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  secondaryPressed: { backgroundColor: colors.sky, transform: [{ scale: 0.99 }] },
  secondaryText: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.55 },
  legal: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  link: { color: colors.blue, fontWeight: "800" },
  panel: { backgroundColor: colors.background, borderRadius: 18, padding: 16, gap: 8 },
  panelTitle: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  item: { color: colors.navy, fontSize: 15, lineHeight: 22 },
});
