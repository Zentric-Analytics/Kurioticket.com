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
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
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

function SearchIcon({ compact = false }: { compact?: boolean }) {
  const size = compact ? 38 : 44;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="compare-lens" x1="8" y1="7" x2="34" y2="35" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DCE7FF" />
        </LinearGradient>
        <LinearGradient id="compare-detail" x1="15" y1="14" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#4E83F4" />
          <Stop offset="1" stopColor="#164ED6" />
        </LinearGradient>
      </Defs>
      <Circle cx="20.5" cy="20.5" r="14.25" fill="url(#compare-lens)" stroke="#1557E8" strokeWidth="4" />
      <Path d="m31 31 10 10" fill="none" stroke="#1557E8" strokeWidth="5" strokeLinecap="round" />
      <Path d="m15 27 2.4-9.3 8.9-3.1-3.1 9-8.2 3.4Z" fill="url(#compare-detail)" stroke="#0E46C7" strokeWidth="1.5" strokeLinejoin="round" />
      <Circle cx="20.7" cy="21" r="2.15" fill="#FFFFFF" />
    </Svg>
  );
}

function SavedTripIcon({ compact = false }: { compact?: boolean }) {
  const size = compact ? 38 : 44;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="saved-cover" x1="13" y1="7" x2="39" y2="42" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#39C7AE" />
          <Stop offset="1" stopColor="#078678" />
        </LinearGradient>
      </Defs>
      <Rect x="6.5" y="11" width="28" height="31" rx="6" fill="#087F73" opacity="0.32" />
      <Rect x="10.5" y="7" width="29.5" height="34" rx="6" fill="url(#saved-cover)" stroke="#087F73" strokeWidth="2.5" />
      <Path d="M16 7v34" fill="none" stroke="#087F73" strokeWidth="2.5" />
      <Path d="M21.5 15h12M21.5 21h8" fill="none" stroke="#EFFFFB" strokeWidth="2.6" strokeLinecap="round" />
      <Circle cx="29.5" cy="31" r="7" fill="#F3FFFC" stroke="#087F73" strokeWidth="2" />
      <Path d="m26.3 31 2.1 2.1 4.4-4.7" fill="none" stroke="#078678" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PriceAlertIcon({ compact = false }: { compact?: boolean }) {
  const size = compact ? 38 : 44;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="alert-bell" x1="13" y1="9" x2="35" y2="39" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#9A72F0" />
          <Stop offset="1" stopColor="#6841C7" />
        </LinearGradient>
      </Defs>
      <Path d="M11 35.5h26l-3.6-5.2v-8.6c0-6.1-3.8-10.2-9.4-10.2s-9.4 4.1-9.4 10.2v8.6L11 35.5Z" fill="url(#alert-bell)" stroke="#6039BB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.7 38.2c.8 2.4 2.6 3.8 5.3 3.8s4.5-1.4 5.3-3.8" fill="#8B63E3" stroke="#6039BB" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M24 11.3V7.5M36.2 14l3-3M11.8 14l-3-3" fill="none" stroke="#7047CE" strokeWidth="3" strokeLinecap="round" />
      <Path d="M18.2 19.7c.5-2.5 2.2-4.2 4.7-4.7" fill="none" stroke="#C9B4FA" strokeWidth="2.2" strokeLinecap="round" />
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
            <Stop offset="0" stopColor="#75C0CF" />
            <Stop offset="0.5" stopColor="#2F89A4" />
            <Stop offset="1" stopColor="#13536F" />
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
        <Circle cx="318" cy="72" r="78" fill="url(#hero-light)" />
        <Ellipse cx="280" cy="146" rx="150" ry="38" fill="#FFF0D0" opacity="0.2" />
        <Path d="M-18 171 35 139l38 12 52-41 46 33 55-47 50 53 43-24 73 45v42H-18Z" fill="#C8D5D0" opacity="0.46" />
        <Path d="M-12 181 52 146l38 19 60-38 48 34 52-29 44 32 52-19 66 35v35H-12Z" fill="#91AAA5" opacity="0.52" />
        <Path d="M-12 188c45-29 84-39 117-27 26 9 43 7 66-7 42-25 76-18 111 6 30 20 67 22 120-3v55H-12Z" fill="#648C8E" opacity="0.78" />
        <Rect y="185" width="390" height="115" fill="url(#hero-water)" />
        <Path d="M-15 197c61-5 111 2 151 8 66 10 147 2 268-19" fill="none" stroke="#E7F6F2" strokeWidth="2" opacity="0.58" />
        <Path d="M173 217c61-2 126-11 194-26M212 238c47-3 94-11 141-22M264 257c29-3 59-8 89-16" fill="none" stroke="#D9F3F1" strokeWidth="1.4" opacity="0.38" />
        <Path d="M-16 172c34-11 60-8 82 8 20 14 26 33 55 44 25 9 56 9 87 28l-7 48H-16Z" fill="url(#hero-cliff)" />
        <Path d="M-9 174c38-10 64-4 84 16-24-4-43 2-65 15Z" fill="#A4B77B" opacity="0.82" />
        <Path d="M-12 205c34-12 68-8 99 10 24 14 43 35 76 47-33-4-62-3-91 9-27 11-55 12-84 7Z" fill="#315F59" opacity="0.7" />
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
  compact?: boolean;
};

function BenefitCard({ title, description, tileStyle, icon, compact = false }: BenefitCardProps) {
  return (
    <View style={[styles.benefitCard, compact && styles.benefitCardCompact]} accessible accessibilityLabel={`${title}. ${description.replace("\n", " ")}`}>
      <View style={[styles.iconTile, compact && styles.iconTileCompact, tileStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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
    <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint="Opens in your browser" hitSlop={10} onPress={openLink}>
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
  const compact = height < 780;
  const tall = height >= 900;
  const narrow = width <= 375;
  const heroHeight = compact ? Math.min(205, Math.max(185, height * 0.27)) : tall ? 235 : 225;

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
        contentContainerStyle={[styles.onboardingScroll, { paddingBottom: Math.max(insets.bottom + 14, 22) }]}
        showsVerticalScrollIndicator={false}
      >
        <View accessible={false} style={[styles.hero, { height: heroHeight }]}>
          <OnboardingHero />
        </View>

        <Animated.View
          style={[
            styles.onboardingPanel,
            compact && styles.onboardingPanelCompact,
            {
              opacity: entrance,
              transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <Text accessibilityRole="header" style={[styles.onboardingHeadline, compact && styles.onboardingHeadlineCompact]}>
            Find the best travel{"\n"}options <Text style={styles.headlineAccent}>in seconds</Text>
          </Text>
          <Text style={styles.onboardingSupport}>
            {narrow
              ? "Compare trusted providers, save your trips, and stay informed when prices change."
              : "Compare trusted providers, save your trips,\nand stay informed when prices change."}
          </Text>

          <View style={[styles.benefits, compact && styles.benefitsCompact]}>
            <BenefitCard
              title="Compare prices"
              description="Compare travel options from trusted providers in one place."
              tileStyle={styles.blueTile}
              icon={<SearchIcon compact={compact} />}
              compact={compact}
            />
            <BenefitCard
              title="Save your trips"
              description="Keep searches and travel plans organized across devices."
              tileStyle={styles.mintTile}
              icon={<SavedTripIcon compact={compact} />}
              compact={compact}
            />
            <BenefitCard
              title="Price alerts"
              description="Stay informed when prices change for trips you care about."
              tileStyle={styles.lavenderTile}
              icon={<PriceAlertIcon compact={compact} />}
              compact={compact}
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
            <Text style={styles.legalIntro}>By continuing, you agree to Kurioticket’s</Text>
            <View style={styles.legalLinks}>
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
    marginTop: -28,
    paddingTop: 28,
    paddingHorizontal: 22,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: "white",
  },
  onboardingPanelCompact: { marginTop: -24, paddingTop: 24, paddingHorizontal: 18 },
  onboardingHeadline: { color: "#081C46", fontSize: 30, lineHeight: 34, fontWeight: "800", letterSpacing: -0.7, textAlign: "center" },
  onboardingHeadlineCompact: { fontSize: 26, lineHeight: 30, letterSpacing: -0.65 },
  headlineAccent: { color: "#1557E8" },
  onboardingSupport: { alignSelf: "center", color: "#485973", fontSize: 15, lineHeight: 19, fontWeight: "500", marginTop: 10, maxWidth: 350, textAlign: "center" },
  benefits: { gap: 10, marginTop: 18 },
  benefitsCompact: { gap: 8, marginTop: 14 },
  benefitCard: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E9EDF3",
    borderRadius: 15,
    backgroundColor: "white",
    shadowColor: "#17335F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  benefitCardCompact: { minHeight: 82, gap: 12, paddingHorizontal: 12, paddingVertical: 8 },
  iconTile: { width: 62, height: 62, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  iconTileCompact: { width: 56, height: 56, borderRadius: 14 },
  blueTile: { backgroundColor: "#E8EFFF" },
  mintTile: { backgroundColor: "#E2F6F0" },
  lavenderTile: { backgroundColor: "#EFE7FF" },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: "#081C42", fontSize: 16, lineHeight: 21, fontWeight: "800", letterSpacing: -0.15 },
  benefitDescription: { color: "#4D5D75", fontSize: 13, lineHeight: 17, fontWeight: "500", marginTop: 1 },
  actions: { gap: 11, marginTop: 18 },
  button: { minHeight: 54, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  onboardingButton: { minHeight: 58, borderRadius: 14 },
  onboardingButtonText: { fontSize: 17, fontWeight: "700" },
  primary: { backgroundColor: "#1646D8" },
  primaryPressed: { backgroundColor: "#0E35AF", transform: [{ scale: 0.99 }] },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  onboardingSecondary: { backgroundColor: "white", borderColor: "#CBD3E1", borderWidth: 1.5 },
  secondaryPressed: { backgroundColor: "#F2F5FA", transform: [{ scale: 0.99 }] },
  secondaryText: { color: "#263B68", fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.55 },
  legalBlock: { alignItems: "center", marginTop: 18 },
  legalIntro: { color: "#52627B", fontSize: 12, lineHeight: 17, textAlign: "center" },
  legalLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  legalJoiner: { color: "#52627B", fontSize: 12, lineHeight: 18 },
  link: { color: "#134FC8", fontSize: 12, lineHeight: 18, fontWeight: "700", textDecorationLine: "underline" },
  linkPressed: { color: "#0E35AF", opacity: 0.7 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: spacing.radius, padding: spacing.card, gap: 16 },
  titleSmall: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.4 },
  body: { color: colors.slate, fontSize: 16, lineHeight: 24, textAlign: "center" },
});
