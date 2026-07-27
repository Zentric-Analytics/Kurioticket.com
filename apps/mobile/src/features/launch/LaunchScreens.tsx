import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { colors, spacing } from "../../theme/tokens";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";

const TERMS_URL = "https://kurioticket.com/terms";
const PRIVACY_URL = "https://kurioticket.com/privacy";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  onboarding?: boolean;
  icon?: ReactNode;
};

function PrimaryButton({ label, onPress, disabled = false, accessibilityLabel, onboarding = false, icon }: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles.primary,
        onboarding && styles.onboardingButton,
        pressed && !disabled && styles.primaryPressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon}
        <Text style={[styles.primaryText, onboarding && styles.onboardingButtonText]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled = false, accessibilityLabel, onboarding = false, icon }: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles.secondary,
        onboarding && styles.onboardingSecondary,
        pressed && !disabled && styles.secondaryPressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon}
        <Text style={[styles.secondaryText, onboarding && styles.onboardingButtonText]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function KurioticketMark({ size = 72 }: { size?: number }) {
  return (
    <Svg
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      width={size}
      height={size}
      viewBox="0 0 1200 1200"
    >
      <Path fill="#135BE7" d="M422.8 954.8V1132c0 25.6 20.8 46.4 46.4 46.4h254.4c45.4 0 63.8-58.5 26.5-84.5L495.8 916.7c-30.8-21.4-73 0.6-73 38.1Z" />
      <Path fill="#135BE7" d="M638.6 613c-47.4-30.1-59.9-93.7-27.5-139.5L892.9 94.8c21.7-30.7-.2-73.2-37.9-73.2H469.2c-25.6 0-46.4 20.8-46.4 46.4v548c0 15 7.3 29.1 19.5 37.8l662.8 472.4c30.7 21.9 73.3-.1 73.3-37.8V169.8c0-45.5-58.6-63.8-84.5-26.5l-322 442.8c-30 43.3-88.8 55.1-133.3 26.9Z" />
      <Rect fill="#135BE7" x="21.6" y="21.6" width="226.6" height="1156.8" rx="30.3" />
    </Svg>
  );
}

function EnvelopeIcon({ color = "white" }: { color?: string }) {
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width={24} height={24} viewBox="0 0 24 24">
      <Rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill="none" stroke={color} strokeWidth="1.9" />
      <Path d="m4 7 8 6 8-6" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PersonIcon() {
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width={25} height={25} viewBox="0 0 24 24">
      <Circle cx="12" cy="7" r="3.25" fill="none" stroke="#263B68" strokeWidth="1.9" />
      <Path d="M5 20c.25-4.3 2.6-6.5 7-6.5s6.75 2.2 7 6.5H5Z" fill="none" stroke="#263B68" strokeWidth="1.9" strokeLinejoin="round" />
    </Svg>
  );
}

function CompassIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Circle cx="16" cy="16" r="11" fill="none" stroke="#174B9B" strokeWidth="1.8" />
      <Path d="m20.5 11.5-2.8 6.2-6.2 2.8 2.8-6.2 6.2-2.8Z" fill="none" stroke="#174B9B" strokeWidth="1.8" strokeLinejoin="round" />
    </Svg>
  );
}

function SavedTripIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Path d="M8.5 6.5h15v20l-7.5-4.3-7.5 4.3v-20Z" fill="none" stroke="#147568" strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M12.5 12h7M12.5 16h5" fill="none" stroke="#147568" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function PriceAlertIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Path d="M8 22.5h16l-2-3.2v-4.8a6 6 0 0 0-12 0v4.8l-2 3.2Z" fill="none" stroke="#6650A4" strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M13.5 26a2.8 2.8 0 0 0 5 0M16 5.5V4" fill="none" stroke="#6650A4" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function TravelAtmosphere({ variant }: { variant: "launch" | "hero" }) {
  const launch = variant === "launch";
  return (
    <Svg
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 390 844"
    >
      <Defs>
        <LinearGradient id={`${variant}-sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={launch ? "#F5FAFF" : "#B9DCFA"} />
          <Stop offset="0.62" stopColor={launch ? "#DFEEFB" : "#DCECF3"} />
          <Stop offset="1" stopColor={launch ? "#D4E6F5" : "#F6D7A8"} />
        </LinearGradient>
        <LinearGradient id={`${variant}-land`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={launch ? "#9DC7C0" : "#2C7775"} />
          <Stop offset="1" stopColor={launch ? "#4D8789" : "#164E63"} />
        </LinearGradient>
      </Defs>
      <Rect width="390" height="844" fill={`url(#${variant}-sky)`} />
      <Circle cx={launch ? 316 : 320} cy={launch ? 176 : 164} r={launch ? 66 : 58} fill="#FFF7DD" opacity="0.82" />
      <Path d="M-35 600C45 536 98 552 159 496c54-50 105-48 151-10 38 31 73 24 116-8v366H-35V600Z" fill={`url(#${variant}-land)`} opacity={launch ? 0.74 : 0.92} />
      <Path d="M-28 672c80-48 137-50 196-16 68 39 141 20 250-42v230H-28V672Z" fill={launch ? "#2D6878" : "#123F57"} opacity={launch ? 0.74 : 0.9} />
      <Path d="M-20 566c84-23 154-17 210 18 69 43 138 38 220-14" fill="none" stroke="#F8FCFF" strokeWidth="5" opacity="0.34" />
    </Svg>
  );
}

type BenefitCardProps = {
  title: string;
  description: string;
  tileStyle: object;
  icon: ReactNode;
};

function BenefitCard({ title, description, tileStyle, icon }: BenefitCardProps) {
  return (
    <View style={styles.benefitCard} accessible accessibilityLabel={`${title}. ${description.replace("\n", " ")}`}>
      <View style={[styles.iconTile, tileStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {icon}
      </View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  const openLink = () => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === "https:") void Linking.openURL(parsedUrl.toString()).catch(() => undefined);
  };

  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint="Opens in your browser" onPress={openLink} style={styles.legalLinkTarget}>
      {({ pressed }) => <Text style={[styles.link, pressed && styles.linkPressed]}>{label}</Text>}
    </Pressable>
  );
}

export function LaunchLoadingScreen({ onReady }: { onReady?: () => void }) {
  return (
    <View style={styles.launch} onLayout={onReady}>
      <TravelAtmosphere variant="launch" />
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.launchSafe}>
        <View accessible accessibilityLabel="Kurioticket. Your journey starts here." style={styles.launchBrand}>
          <KurioticketMark />
          <Text style={styles.launchWordmark}>Kurioticket</Text>
          <Text style={styles.launchTagline}>
            Your <Text style={styles.launchTaglineAccent}>journey</Text> starts here
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

export function OnboardingScreen() {
  const [pendingAction, setPendingAction] = useState<"email" | "guest" | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = Math.min(286, Math.max(196, height * 0.29));

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotionEnabled) => {
        if (!mounted) return;
        if (reduceMotionEnabled) {
          entrance.setValue(1);
          return;
        }
        Animated.timing(entrance, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      })
      .catch(() => entrance.setValue(1));
    return () => {
      mounted = false;
    };
  }, [entrance]);

  async function continueGuest() {
    if (pendingAction) return;
    setPendingAction("guest");
    try {
      await writeOnboardingCompleted();
      router.replace("/(tabs)");
    } finally {
      setPendingAction(null);
    }
  }

  function continueEmail() {
    if (pendingAction) return;
    setPendingAction("email");
    router.push("/email-auth");
    requestAnimationFrame(() => setPendingAction(null));
  }

  return (
    <View style={styles.onboardingScreen}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.onboardingScroll, { paddingBottom: Math.max(insets.bottom, 14) }]}
        showsVerticalScrollIndicator={false}
      >
        <View accessible={false} style={[styles.hero, { height: heroHeight }]}>
          <TravelAtmosphere variant="hero" />
        </View>

        <Animated.View
          style={[
            styles.onboardingPanel,
            {
              opacity: entrance,
              transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <Text accessibilityRole="header" style={styles.onboardingHeadline}>
            Find better travel options <Text style={styles.headlineAccent}>in seconds</Text>
          </Text>
          <Text style={styles.onboardingSupport}>
            Compare trusted providers, save your trips, and stay informed when prices change.
          </Text>

          <View style={styles.benefits}>
            <BenefitCard
              title="Compare trusted options"
              description="Compare travel choices from trusted providers."
              tileStyle={styles.blueTile}
              icon={<CompassIcon />}
            />
            <BenefitCard
              title="Save your trips"
              description="Keep searches and travel plans organized."
              tileStyle={styles.mintTile}
              icon={<SavedTripIcon />}
            />
            <BenefitCard
              title="Price alerts"
              description="Stay informed when prices change."
              tileStyle={styles.lavenderTile}
              icon={<PriceAlertIcon />}
            />
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label="Continue with Email"
              onPress={continueEmail}
              disabled={pendingAction !== null}
              onboarding
              icon={<EnvelopeIcon />}
            />
            <SecondaryButton
              label="Continue as Guest"
              onPress={continueGuest}
              disabled={pendingAction !== null}
              onboarding
              icon={<PersonIcon />}
            />
          </View>

          <View style={styles.legalBlock}>
            <Text style={styles.legalIntro}>{"By continuing, you agree to Kurioticket\u2019s"}</Text>
            <View style={styles.legalLinks}>
              <LegalLink label="Terms of Service" url={TERMS_URL} />
              <Text style={styles.legalJoiner}>and</Text>
              <LegalLink label="Privacy Policy" url={PRIVACY_URL} />
              <Text style={styles.legalJoiner}>.</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
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
  launch: { flex: 1, backgroundColor: "#DDEBFA", overflow: "hidden" },
  launchSafe: { flex: 1, justifyContent: "center" },
  launchBrand: { alignItems: "center", gap: 8, paddingHorizontal: 24, transform: [{ translateY: -48 }] },
  launchWordmark: { color: "#071D45", fontSize: 40, lineHeight: 48, fontWeight: "800", letterSpacing: -1.2, textAlign: "center" },
  launchTagline: { color: "#68758F", fontSize: 17, lineHeight: 24, fontWeight: "600", textAlign: "center" },
  launchTaglineAccent: { color: "#1557E8", fontWeight: "800" },
  onboardingScreen: { flex: 1, backgroundColor: "white" },
  onboardingScroll: { flexGrow: 1, backgroundColor: "white" },
  hero: { width: "100%", overflow: "hidden", backgroundColor: "#C8E4FA" },
  onboardingPanel: {
    flex: 1,
    width: "100%",
    marginTop: -30,
    paddingTop: 24,
    paddingHorizontal: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "white",
  },
  onboardingHeadline: { color: "#081C46", fontSize: 29, lineHeight: 34, fontWeight: "800", letterSpacing: -0.7, textAlign: "center" },
  headlineAccent: { color: "#1557E8" },
  onboardingSupport: { color: "#65718D", fontSize: 15, lineHeight: 20, fontWeight: "600", textAlign: "center", marginTop: 10 },
  benefits: { gap: 9, marginTop: 18 },
  benefitCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E9EDF3",
    borderRadius: 14,
    backgroundColor: "white",
  },
  iconTile: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  blueTile: { backgroundColor: "#E8EFFF" },
  mintTile: { backgroundColor: "#E2F6F0" },
  lavenderTile: { backgroundColor: "#EFE7FF" },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: "#0A1D44", fontSize: 16, lineHeight: 21, fontWeight: "800" },
  benefitDescription: { color: "#586783", fontSize: 13.5, lineHeight: 18, fontWeight: "500", marginTop: 2 },
  actions: { gap: 11, marginTop: 16 },
  button: { minHeight: 54, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  onboardingButton: { minHeight: 56, borderRadius: 14 },
  onboardingButtonText: { fontSize: 17, fontWeight: "700" },
  primary: { backgroundColor: "#1646D8" },
  primaryPressed: { backgroundColor: "#0E35AF", transform: [{ scale: 0.99 }] },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  onboardingSecondary: { borderColor: "#D3D9E4", borderWidth: 1.5 },
  secondaryPressed: { backgroundColor: colors.sky, transform: [{ scale: 0.99 }] },
  secondaryText: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.55 },
  legalBlock: { alignItems: "center", marginTop: 10 },
  legalIntro: { color: "#596780", fontSize: 12, lineHeight: 18, textAlign: "center" },
  legalLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", columnGap: 2 },
  legalLinkTarget: { minHeight: 44, minWidth: 44, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  legalJoiner: { color: "#596780", fontSize: 12, lineHeight: 22 },
  link: { color: "#134FC8", fontSize: 12, lineHeight: 22, fontWeight: "700", textDecorationLine: "underline" },
  linkPressed: { color: "#0E35AF", opacity: 0.7 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: spacing.radius, padding: spacing.card, gap: 16 },
  titleSmall: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.4 },
  body: { color: colors.slate, fontSize: 16, lineHeight: 24, textAlign: "center" },
});
