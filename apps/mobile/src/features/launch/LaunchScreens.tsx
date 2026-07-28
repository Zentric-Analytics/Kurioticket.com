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
  icon?: ReactNode;
  primary?: boolean;
};

function ActionButton({ label, onPress, disabled = false, icon, primary = false }: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary ? styles.primaryButton : styles.secondaryButton,
        pressed && !disabled && (primary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon}
        <Text style={primary ? styles.primaryButtonText : styles.secondaryButtonText}>{label}</Text>
      </View>
    </Pressable>
  );
}

function EnvelopeIcon() {
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width={24} height={24} viewBox="0 0 24 24">
      <Rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill="none" stroke="white" strokeWidth="1.9" />
      <Path d="m4 7 8 6 8-6" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PersonIcon() {
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width={25} height={25} viewBox="0 0 24 24">
      <Circle cx="12" cy="7" r="3.25" fill="none" stroke="#14264D" strokeWidth="1.9" />
      <Path d="M5 20c.25-4.3 2.6-6.5 7-6.5s6.75 2.2 7 6.5H5Z" fill="none" stroke="#14264D" strokeWidth="1.9" strokeLinejoin="round" />
    </Svg>
  );
}

function BrandAtmosphere() {
  return (
    <Svg accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill} viewBox="0 0 390 844">
      <Defs>
        <LinearGradient id="brand-base" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.48" stopColor="#F7FAFF" />
          <Stop offset="1" stopColor="#EDF4FF" />
        </LinearGradient>
      </Defs>
      <Rect width="390" height="844" fill="url(#brand-base)" />
      <Circle cx="194" cy="368" r="246" fill="#FFFFFF" opacity="0.44" />
      <Circle cx="386" cy="772" r="238" fill="#DCEAFF" opacity="0.32" />
    </Svg>
  );
}

function SantoriniHero() {
  return (
    <View style={styles.heroMedia}>
      <Svg
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 390 560"
      >
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0879DE" />
            <Stop offset="0.48" stopColor="#66B8ED" />
            <Stop offset="1" stopColor="#DDF3FF" />
          </LinearGradient>
          <LinearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2D8FCA" />
            <Stop offset="1" stopColor="#075480" />
          </LinearGradient>
          <LinearGradient id="cliff" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#715A47" />
            <Stop offset="1" stopColor="#302D2D" />
          </LinearGradient>
        </Defs>

        <Rect width="390" height="560" fill="url(#sky)" />
        <Path d="M0 138c45-24 79-12 116 4 40 18 76 15 111-2 43-22 87-18 163 7" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.44" />
        <Path d="M24 195c48-19 91-14 134 3M194 157c54-17 107-12 158 10" fill="none" stroke="#FFFFFF" strokeWidth="4" opacity="0.34" />
        <Rect y="308" width="390" height="252" fill="url(#sea)" />
        <Path d="M0 327 64 295l74 20 76-38 80 30 96-33v76H0Z" fill="#365D73" opacity="0.75" />
        <Path d="M168 560 188 330l58-40 49-2 38-38 57-14v324Z" fill="url(#cliff)" />

        <Rect x="276" y="272" width="58" height="78" rx="4" fill="#FFFDF8" />
        <Rect x="320" y="238" width="70" height="112" rx="5" fill="#FFFDF8" />
        <Rect x="235" y="315" width="74" height="76" rx="5" fill="#FFFDF8" />
        <Rect x="205" y="354" width="74" height="70" rx="5" fill="#FFFDF8" />
        <Rect x="170" y="397" width="78" height="70" rx="5" fill="#FFFDF8" />

        <Circle cx="350" cy="238" r="36" fill="#0578D5" />
        <Rect x="314" y="238" width="72" height="16" fill="#FFFDF8" />
        <Circle cx="265" cy="315" r="28" fill="#087DDA" />
        <Rect x="237" y="315" width="56" height="14" fill="#FFFDF8" />
        <Circle cx="199" cy="397" r="24" fill="#0B80DC" />
        <Rect x="175" y="397" width="48" height="12" fill="#FFFDF8" />

        <Rect x="334" y="280" width="12" height="27" rx="6" fill="#C7E6F4" />
        <Rect x="294" y="300" width="10" height="23" rx="5" fill="#C7E6F4" />
        <Rect x="252" y="350" width="10" height="24" rx="5" fill="#C7E6F4" />
        <Rect x="216" y="386" width="10" height="22" rx="5" fill="#C7E6F4" />
        <Rect x="185" y="429" width="10" height="22" rx="5" fill="#C7E6F4" />

        <Path d="M152 560 176 381 206 358 228 330 257 317 284 288 317 272 348 238 390 232v328Z" fill="#FFFFFF" opacity="0.12" />
      </Svg>
      <View style={styles.heroOverlay} />
      <SafeAreaView edges={["top"]} style={styles.heroBrandSafe}>
        <View accessible accessibilityLabel="Kurioticket. Your journey starts here." style={styles.heroBrand}>
          <Image
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            resizeMode="contain"
            source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
            style={styles.heroLogo}
          />
          <Text style={styles.heroTagline}>Your journey starts here.</Text>
        </View>
      </SafeAreaView>
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
          <Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" resizeMode="contain" source={require("../../../assets/kurioticket-logo-primary-light-bg.png")} style={styles.launchLogo} />
          <Text style={styles.launchTagline}>Your <Text style={styles.launchTaglineAccent}>journey</Text> starts here</Text>
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
  const compact = height < 780;
  const tall = height >= 900;
  const heroHeight = compact ? 430 : tall ? 575 : 510;

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
        contentContainerStyle={[styles.onboardingScroll, { paddingBottom: Math.max(insets.bottom, 8) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <SantoriniHero />
        </View>

        <Animated.View
          style={[
            styles.signInPanel,
            compact && styles.signInPanelCompact,
            {
              opacity: entrance,
              transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <Text accessibilityRole="header" style={[styles.panelTitle, compact && styles.panelTitleCompact]}>Continue your journey</Text>
          <Text style={styles.panelSupport}>Sign in or create an account to get the{compact ? " " : "\n"}best travel experience.</Text>

          <View style={styles.actions}>
            <ActionButton label="Continue with Email" onPress={continueEmail} disabled={pendingAction !== null} icon={<EnvelopeIcon />} primary />
            <ActionButton label="Continue as Guest" onPress={continueGuest} disabled={pendingAction !== null} icon={<PersonIcon />} />
          </View>

          <View style={styles.legalBlock}>
            <Text style={styles.legalIntro}>By continuing, you agree to our</Text>
            <View style={styles.legalLinks}>
              <LegalLink label="Terms of Service" url={TERMS_URL} />
              <Text style={styles.legalJoiner}> and </Text>
              <LegalLink label="Privacy Policy" url={PRIVACY_URL} />
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
        <ActionButton label="Back to Kurioticket" onPress={() => router.replace("/(tabs)")} />
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
        <ActionButton label="Retry" onPress={onRetry} primary />
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
  hero: { width: "100%", overflow: "hidden", backgroundColor: "#1685D9" },
  heroMedia: { flex: 1, overflow: "hidden", backgroundColor: "#1685D9" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 40, 76, 0.03)" },
  heroBrandSafe: { ...StyleSheet.absoluteFillObject },
  heroBrand: { alignItems: "flex-start", paddingHorizontal: 28, paddingTop: 44 },
  heroLogo: { width: 250, height: 62 },
  heroTagline: { marginTop: 2, marginLeft: 4, color: "#102445", fontSize: 16, lineHeight: 22, fontWeight: "700" },

  signInPanel: {
    width: "100%",
    marginTop: -52,
    paddingTop: 27,
    paddingHorizontal: 28,
    paddingBottom: 24,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    backgroundColor: "white",
  },
  signInPanelCompact: { marginTop: -44, paddingTop: 23, paddingHorizontal: 20, paddingBottom: 20 },
  panelTitle: { color: "#0B1E45", fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.55, textAlign: "center" },
  panelTitleCompact: { fontSize: 25, lineHeight: 31 },
  panelSupport: { alignSelf: "center", marginTop: 8, color: "#465571", fontSize: 16, lineHeight: 22, fontWeight: "500", maxWidth: 340, textAlign: "center" },
  actions: { gap: 12, marginTop: 23 },
  actionButton: { minHeight: 58, borderRadius: 15, paddingHorizontal: 18, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  primaryButton: { backgroundColor: "#1455E8" },
  primaryPressed: { backgroundColor: "#0C3DB8", transform: [{ scale: 0.99 }] },
  secondaryButton: { backgroundColor: "white", borderColor: "#CFD6E2", borderWidth: 1.5 },
  secondaryPressed: { backgroundColor: "#F4F7FB", transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: "white", fontSize: 17, fontWeight: "700" },
  secondaryButtonText: { color: "#14264D", fontSize: 17, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  legalBlock: { alignItems: "center", marginTop: 22 },
  legalIntro: { color: "#53627A", fontSize: 13, lineHeight: 18, textAlign: "center" },
  legalLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  legalJoiner: { color: "#53627A", fontSize: 13, lineHeight: 19 },
  link: { color: "#134FC8", fontSize: 13, lineHeight: 19, fontWeight: "700", textDecorationLine: "underline" },
  linkPressed: { color: "#0E35AF", opacity: 0.7 },

  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: spacing.radius, padding: spacing.card, gap: 16 },
  titleSmall: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.4 },
  body: { color: colors.slate, fontSize: 16, lineHeight: 24, textAlign: "center" },
});