import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { colors, spacing } from "../../theme/tokens";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";
const TERMS_URL = "https://kurioticket.com/terms";
const PRIVACY_URL = "https://kurioticket.com/privacy";


type ButtonProps = { label: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string; onboarding?: boolean };

function PrimaryButton({ label, onPress, disabled = false, accessibilityLabel, onboarding = false }: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles.primary, onboarding && styles.onboardingButton, pressed && !disabled && styles.primaryPressed, disabled && styles.disabled]}
    >
      <Text style={[styles.primaryText, onboarding && styles.onboardingButtonText]}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled = false, accessibilityLabel, onboarding = false }: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles.secondary, onboarding && styles.onboardingSecondary, pressed && !disabled && styles.secondaryPressed, disabled && styles.disabled]}
    >
      <Text style={[styles.secondaryText, onboarding && styles.onboardingButtonText]}>{label}</Text>
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

export function OnboardingScreen() {
  const [guestPending, setGuestPending] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

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
      router.replace("/(tabs)");
    } finally {
      setGuestPending(false);
    }
  }

  const animatedStyle = {
    minHeight: Math.max(0, height - insets.top - insets.bottom - spacing.screen * 2),
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <Screen>
      <Animated.View style={[styles.onboarding, animatedStyle]}>
        <View style={styles.brandArea}>
          <Text accessibilityRole="header" style={styles.wordmark}>Kurioticket</Text>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.benefits}>
            <BenefitRow>Compare flight options clearly</BenefitRow>
            <BenefitRow>Save trips and searches</BenefitRow>
            <BenefitRow>Track fares with price alerts</BenefitRow>
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="Continue with email" onPress={() => router.push("/email-auth")} disabled={guestPending} onboarding />
            <SecondaryButton label="Continue as guest" onPress={continueGuest} disabled={guestPending} onboarding />
          </View>
        </View>

        <Text style={styles.legal}>By continuing, you agree to Kurioticket’s <LegalLink label="Terms of Service" url={TERMS_URL} /> and <LegalLink label="Privacy Policy" url={PRIVACY_URL} />.</Text>
      </Animated.View>
    </Screen>
  );
}

export function ReservedEmailAuthScreen() {
  return (
    <Screen centered>
      <Logo compact />
      <View style={styles.card}>
        <Text style={styles.titleSmall}>Email account access</Text>
        <Text style={styles.body}>Email sign-in is coming soon. Continue as a guest to search flights and explore Kurioticket today.</Text>
        <SecondaryButton label="Back to Kurioticket" onPress={() => router.replace("/(tabs)")} />
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
  onboarding: { width: "100%", paddingTop: 12, paddingBottom: 4 },
  brandArea: { alignItems: "center", paddingVertical: 20 },
  wordmark: { color: colors.navy, fontSize: 30, lineHeight: 38, fontWeight: "700", letterSpacing: -0.4, textAlign: "center" },
  mainContent: { marginTop: 38, gap: 34 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: spacing.radius, padding: spacing.card, gap: 16 },
  titleSmall: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.4 },
  body: { color: colors.slate, fontSize: 16, lineHeight: 24, textAlign: "center" },
  benefits: { gap: 14, paddingHorizontal: 6 },
  benefitRow: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky },
  benefitDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blue },
  benefitText: { flex: 1, color: colors.navy, fontSize: 16, lineHeight: 23, fontWeight: "600" },
  actions: { gap: 8 },
  button: { minHeight: 54, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  onboardingButton: { borderRadius: 14 },
  onboardingButtonText: { fontWeight: "600" },
  primary: { backgroundColor: colors.blue },
  primaryPressed: { backgroundColor: colors.navy, transform: [{ scale: 0.99 }] },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  onboardingSecondary: { backgroundColor: "transparent", borderColor: "transparent" },
  secondaryPressed: { backgroundColor: colors.sky, transform: [{ scale: 0.99 }] },
  secondaryText: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.55 },
  legal: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: "auto", paddingTop: 32 },
  link: { color: colors.blue, fontWeight: "600" },
});
