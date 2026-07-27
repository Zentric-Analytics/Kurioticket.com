import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
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
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
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

function BrandAtmosphere() {
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
        <LinearGradient id="brand-base" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.48" stopColor="#F7FAFF" />
          <Stop offset="1" stopColor="#EDF4FF" />
        </LinearGradient>
        <RadialGradient id="brand-light" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.96" />
          <Stop offset="0.58" stopColor="#F3F8FF" stopOpacity="0.44" />
          <Stop offset="1" stopColor="#DCEAFF" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="brand-glow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#D8E8FF" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#EDF4FF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="390" height="844" fill="url(#brand-base)" />
      <Circle cx="194" cy="368" r="246" fill="url(#brand-light)" />
      <Circle cx="386" cy="772" r="238" fill="url(#brand-glow)" />
      <Circle cx="-18" cy="64" r="184" fill="#FFFFFF" opacity="0.48" />
    </Svg>
  );
}

function OnboardingHero() {
  return (
    <View style={styles.heroMedia}>
      {/* This fixed media layer can be replaced with an approved destination image without changing hero spacing. */}
      <Svg
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 390 286"
      >
        <Defs>
          <LinearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4A91D4" />
            <Stop offset="0.54" stopColor="#9DD4E3" />
            <Stop offset="1" stopColor="#F8D8A5" />
          </LinearGradient>
          <LinearGradient id="hero-distance" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#527C91" />
            <Stop offset="0.55" stopColor="#376E7D" />
            <Stop offset="1" stopColor="#234D65" />
          </LinearGradient>
          <LinearGradient id="hero-water" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3F8B9A" />
            <Stop offset="1" stopColor="#14506B" />
          </LinearGradient>
          <RadialGradient id="hero-light" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#FFF8D8" stopOpacity="0.94" />
            <Stop offset="1" stopColor="#FFE2AE" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="390" height="286" fill="url(#hero-sky)" />
        <Circle cx="314" cy="100" r="78" fill="url(#hero-light)" />
        <Path d="M-24 181c55-22 94-31 132-20 32 10 47 2 73-10 45-21 80-14 112 10 34 26 70 18 121-6v131H-24V181Z" fill="url(#hero-distance)" opacity="0.72" />
        <Path d="M-10 207c71-14 135-10 193 8 69 21 143 15 217-18v89H-10v-79Z" fill="url(#hero-water)" />
        <Path d="M-10 220c74-9 131-5 186 10 75 20 148 15 224-15" fill="none" stroke="#D7F2EF" strokeWidth="2" opacity="0.48" />
        <Path d="M229 86c14-8 28-8 42 0" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.28" />
      </Svg>
      <View style={styles.heroVignette} />
    </View>
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
      <BrandAtmosphere />
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.launchSafe}>
        <View accessible accessibilityLabel="Kurioticket. Your journey starts here." style={styles.launchBrand}>
          <Image
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            resizeMode="contain"
            source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
            style={styles.launchLogo}
          />
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
          <OnboardingHero />
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
  launch: { flex: 1, backgroundColor: "#F7FAFF", overflow: "hidden" },
  launchSafe: { flex: 1, justifyContent: "center" },
  launchBrand: { alignItems: "center", gap: 15, paddingHorizontal: 24, transform: [{ translateY: -28 }] },
  launchLogo: { width: 306, maxWidth: "88%", height: 72 },
  launchTagline: { color: "#68758F", fontSize: 17, lineHeight: 24, fontWeight: "600", textAlign: "center" },
  launchTaglineAccent: { color: "#1557E8", fontWeight: "800" },
  onboardingScreen: { flex: 1, backgroundColor: "white" },
  onboardingScroll: { flexGrow: 1, backgroundColor: "white" },
  hero: { width: "100%", overflow: "hidden", backgroundColor: "#83BDD8" },
  heroMedia: { flex: 1, overflow: "hidden", backgroundColor: "#83BDD8" },
  heroVignette: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6, 38, 66, 0.06)" },
  onboardingPanel: {
    flex: 1,
    width: "100%",
    marginTop: -30,
    paddingTop: 27,
    paddingHorizontal: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "white",
  },
  onboardingHeadline: { color: "#081C46", fontSize: 29, lineHeight: 34, fontWeight: "800", letterSpacing: -0.7, textAlign: "center" },
  headlineAccent: { color: "#1557E8" },
  onboardingSupport: { color: "#6A7690", fontSize: 15, lineHeight: 21, fontWeight: "500", textAlign: "center", marginTop: 11 },
  benefits: { gap: 11, marginTop: 21 },
  benefitCard: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E9EDF3",
    borderRadius: 17,
    backgroundColor: "white",
    shadowColor: "#17335F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  iconTile: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  blueTile: { backgroundColor: "#E8EFFF" },
  mintTile: { backgroundColor: "#E2F6F0" },
  lavenderTile: { backgroundColor: "#EFE7FF" },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: "#081C42", fontSize: 16.5, lineHeight: 22, fontWeight: "800", letterSpacing: -0.15 },
  benefitDescription: { color: "#6A7690", fontSize: 13.5, lineHeight: 19, fontWeight: "400", marginTop: 3 },
  actions: { gap: 11, marginTop: 19 },
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
