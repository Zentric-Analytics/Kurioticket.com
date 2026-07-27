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

function SearchIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Circle cx="14" cy="14" r="8.5" fill="none" stroke="#1764D9" strokeWidth="1.9" />
      <Path d="m20.4 20.4 6.1 6.1" fill="none" stroke="#1764D9" strokeWidth="1.9" strokeLinecap="round" />
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
      <Svg
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 390 300"
      >
        <Defs>
          <LinearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4897D5" />
            <Stop offset="0.55" stopColor="#A9D9E8" />
            <Stop offset="1" stopColor="#F1E4C9" />
          </LinearGradient>
          <LinearGradient id="hero-water" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#68B7CB" />
            <Stop offset="0.55" stopColor="#3189A6" />
            <Stop offset="1" stopColor="#17627E" />
          </LinearGradient>
          <LinearGradient id="hero-cliff" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#748F78" />
            <Stop offset="0.52" stopColor="#486D67" />
            <Stop offset="1" stopColor="#234E59" />
          </LinearGradient>
          <RadialGradient id="hero-light" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#FFF9DE" stopOpacity="0.88" />
            <Stop offset="0.46" stopColor="#FFF0C4" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#FFF0C4" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="390" height="300" fill="url(#hero-sky)" />
        <Circle cx="318" cy="76" r="82" fill="url(#hero-light)" />
        <Path d="M-18 169 38 137l35 13 53-39 45 32 55-45 49 51 43-22 70 43v42H-18Z" fill="#C1D2CF" opacity="0.52" />
        <Path d="M-12 184c45-28 84-38 117-27 26 9 43 7 66-7 42-25 76-18 111 6 30 20 67 22 120-3v57H-12Z" fill="#75999B" opacity="0.7" />
        <Rect y="185" width="390" height="115" fill="url(#hero-water)" />
        <Path d="M-15 196c61-5 111 2 151 8 66 10 147 2 268-19" fill="none" stroke="#D9F1EF" strokeWidth="2" opacity="0.52" />
        <Path d="M190 224c53-3 111-12 174-27M225 242c43-3 84-10 126-20" fill="none" stroke="#D7F2F2" strokeWidth="1.5" opacity="0.35" />
        <Path d="M-16 172c34-11 60-8 82 8 20 14 26 33 55 44 25 9 56 9 87 28l-7 48H-16Z" fill="url(#hero-cliff)" />
        <Path d="M-9 174c38-10 64-4 84 16-24-4-43 2-65 15Z" fill="#9DAE78" opacity="0.75" />
        <Path d="M-5 232c39-5 77 5 113 31 18 13 37 21 59 26H-5Z" fill="#173F4E" opacity="0.52" />
        <Path d="M87 224c11 4 21 10 31 18" fill="none" stroke="#D9C995" strokeWidth="2" opacity="0.45" />
        <Rect y="151" width="390" height="61" fill="#EAF1E8" opacity="0.1" />
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
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height <= 700;
  const narrow = width <= 375;
  const heroHeight = compact ? Math.max(190, height * 0.31) : Math.min(300, Math.max(238, height * 0.31));

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
            (compact || narrow) && styles.onboardingPanelCompact,
            {
              opacity: entrance,
              transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <Text accessibilityRole="header" style={[styles.onboardingHeadline, compact && styles.onboardingHeadlineCompact]}>
            Find better travel{"\n"}options <Text style={styles.headlineAccent}>in seconds</Text>
          </Text>
          <Text style={styles.onboardingSupport}>
            Compare trusted providers, save your trips, and stay informed when prices change.
          </Text>

          <View style={[styles.benefits, compact && styles.benefitsCompact]}>
            <BenefitCard
              title="Compare trusted options"
              description="See travel choices from trusted providers in one place."
              tileStyle={styles.blueTile}
              icon={<SearchIcon />}
            />
            <BenefitCard
              title="Save your trips"
              description="Keep searches and travel plans organized across devices."
              tileStyle={styles.mintTile}
              icon={<SavedTripIcon />}
            />
            <BenefitCard
              title="Price alerts"
              description="Stay informed when prices change for trips you care about."
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
            <View style={styles.legalLinks}>
              <Text style={styles.legalIntro}>By continuing, you agree to our </Text>
              <LegalLink label="Terms of Service" url={TERMS_URL} />
              <Text style={styles.legalJoiner}> and </Text>
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
    paddingTop: 35,
    paddingHorizontal: 28,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: "white",
  },
  onboardingPanelCompact: { paddingTop: 27, paddingHorizontal: 20 },
  onboardingHeadline: { color: "#081C46", fontSize: 31, lineHeight: 37, fontWeight: "800", letterSpacing: -0.7, textAlign: "left" },
  onboardingHeadlineCompact: { fontSize: 28, lineHeight: 33 },
  headlineAccent: { color: "#1557E8" },
  onboardingSupport: { color: "#667085", fontSize: 15.5, lineHeight: 23, fontWeight: "400", marginTop: 12, maxWidth: 470 },
  benefits: { gap: 12, marginTop: 23 },
  benefitsCompact: { gap: 9, marginTop: 18 },
  benefitCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
  iconTile: { width: 66, height: 66, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  blueTile: { backgroundColor: "#E8EFFF" },
  mintTile: { backgroundColor: "#E2F6F0" },
  lavenderTile: { backgroundColor: "#EFE7FF" },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: "#081C42", fontSize: 16.5, lineHeight: 22, fontWeight: "800", letterSpacing: -0.15 },
  benefitDescription: { color: "#667085", fontSize: 13.5, lineHeight: 19, fontWeight: "400", marginTop: 3 },
  actions: { gap: 11, marginTop: 19 },
  button: { minHeight: 54, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  onboardingButton: { minHeight: 56, borderRadius: 14 },
  onboardingButtonText: { fontSize: 17, fontWeight: "700" },
  primary: { backgroundColor: "#1646D8" },
  primaryPressed: { backgroundColor: "#0E35AF", transform: [{ scale: 0.99 }] },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  onboardingSecondary: { borderColor: "#1764D9", borderWidth: 1.5 },
  secondaryPressed: { backgroundColor: colors.sky, transform: [{ scale: 0.99 }] },
  secondaryText: { color: "#1764D9", fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.55 },
  legalBlock: { alignItems: "center", marginTop: 12 },
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
