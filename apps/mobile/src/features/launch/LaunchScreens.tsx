import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  ImageBackground,
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
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { colors, spacing } from "../../theme/tokens";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";

const TERMS_URL = "https://kurioticket.com/terms";
const PRIVACY_URL = "https://kurioticket.com/privacy";
const LAUNCH_BACKGROUND = require("../../../assets/launch/kurioticket-launch-coast-aircraft.png");
const ONBOARDING_HERO = require("../../../assets/onboarding/kurioticket-greek-island-hero.png");

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

function SearchFlightIcon() {
  return (
    <Svg width={54} height={54} viewBox="0 0 54 54">
      <Circle cx="23" cy="22" r="13" fill="none" stroke="#164ED8" strokeWidth="3" />
      <Path d="m32.5 31.5 10 10" stroke="#164ED8" strokeWidth="4" strokeLinecap="round" />
      <Path d="m16.5 23.5 13-7-5 11-2.5-3-5.5-1Z" fill="#8FAEF8" />
    </Svg>
  );
}

function SuitcaseHeartIcon() {
  return (
    <Svg width={54} height={54} viewBox="0 0 54 54">
      <Path d="M18 17v-4c0-2 1.5-3 3.5-3h8c2 0 3.5 1 3.5 3v4" fill="none" stroke="#159B87" strokeWidth="3" />
      <Rect x="10" y="16" width="33" height="30" rx="6" fill="#18B99F" />
      <Path d="M38 28c-3.2-3.5-8.5-1.2-8.5 3.2 0 4.3 8.5 9.3 8.5 9.3s8.5-5 8.5-9.3c0-4.4-5.3-6.7-8.5-3.2Z" fill="white" />
    </Svg>
  );
}

function BellAlertIcon() {
  return (
    <Svg width={54} height={54} viewBox="0 0 54 54">
      <Path d="M13 36h29l-3.5-5.5v-8.2c0-7-4-11.3-10.5-11.3s-10.5 4.3-10.5 11.3v8.2L13 36Z" fill="#7549DC" />
      <Path d="M23 40c.8 4.5 8.2 4.5 9 0" fill="none" stroke="#7549DC" strokeWidth="3" strokeLinecap="round" />
      <Circle cx="42" cy="12" r="6" fill="#F43F5E" />
      <Circle cx="42" cy="12" r="1.8" fill="white" />
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
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} hitSlop={10} onPress={() => void Linking.openURL(url)}>
      {({ pressed }) => <Text style={[styles.link, pressed && styles.linkPressed]}>{label}</Text>}
    </Pressable>
  );
}

export function LaunchLoadingScreen({ onReady }: { onReady?: () => void }) {
  return (
    <ImageBackground
      accessibilityIgnoresInvertColors
      source={LAUNCH_BACKGROUND}
      resizeMode="cover"
      style={styles.launch}
      imageStyle={styles.launchImage}
      onLayout={onReady}
    >
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
    </ImageBackground>
  );
}

export function OnboardingScreen() {
  const [guestPending, setGuestPending] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = Math.min(320, Math.max(238, height * 0.32));

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
    if (guestPending) return;
    setGuestPending(true);
    try {
      await writeOnboardingCompleted();
      router.replace("/(tabs)");
    } finally {
      setGuestPending(false);
    }
  }

  return (
    <View style={styles.onboardingScreen}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.onboardingScroll, { paddingBottom: Math.max(insets.bottom, 14) }]}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          accessibilityIgnoresInvertColors
          accessible={false}
          source={ONBOARDING_HERO}
          resizeMode="cover"
          style={[styles.hero, { height: heroHeight }]}
          imageStyle={styles.heroImage}
        />

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
            Find the best travel{"\n"}options <Text style={styles.headlineAccent}>in seconds</Text>
          </Text>
          <Text style={styles.onboardingSupport}>
            Compare flights from trusted providers,{"\n"}save your trips, and never miss a great fare.
          </Text>

          <View style={styles.benefits}>
            <BenefitCard
              title="Compare prices"
              description={"See the best flight options from\nhundreds of trusted providers."}
              tileStyle={styles.blueTile}
              icon={<SearchFlightIcon />}
            />
            <BenefitCard
              title="Save your trips"
              description={"Save searches and itineraries\nacross all your devices."}
              tileStyle={styles.mintTile}
              icon={<SuitcaseHeartIcon />}
            />
            <BenefitCard
              title="Price alerts"
              description={"Get notified when prices drop\nfor your favorite trips."}
              tileStyle={styles.lavenderTile}
              icon={<BellAlertIcon />}
            />
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label="Continue with Email"
              onPress={() => router.push("/email-auth")}
              disabled={guestPending}
              onboarding
              icon={<EnvelopeIcon />}
            />
            <SecondaryButton
              label="Continue as Guest"
              onPress={continueGuest}
              disabled={guestPending}
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
  launch: { flex: 1, backgroundColor: "#DDEBFA" },
  launchImage: { top: 0, bottom: 0 },
  launchSafe: { flex: 1, justifyContent: "center" },
  launchBrand: { alignItems: "center", gap: 8, paddingHorizontal: 24, transform: [{ translateY: -48 }] },
  launchWordmark: { color: "#071D45", fontSize: 40, lineHeight: 48, fontWeight: "800", letterSpacing: -1.2, textAlign: "center" },
  launchTagline: { color: "#68758F", fontSize: 17, lineHeight: 24, fontWeight: "600", textAlign: "center" },
  launchTaglineAccent: { color: "#1557E8", fontWeight: "800" },
  onboardingScreen: { flex: 1, backgroundColor: "white" },
  onboardingScroll: { flexGrow: 1, backgroundColor: "white" },
  hero: { width: "100%", backgroundColor: "#C8E4FA" },
  heroImage: { top: 0 },
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
  onboardingHeadline: { color: "#081C46", fontSize: 30, lineHeight: 34, fontWeight: "800", letterSpacing: -0.7, textAlign: "center" },
  headlineAccent: { color: "#1557E8" },
  onboardingSupport: { color: "#65718D", fontSize: 15, lineHeight: 20, fontWeight: "600", textAlign: "center", marginTop: 10 },
  benefits: { gap: 9, marginTop: 20 },
  benefitCard: {
    minHeight: 88,
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
  iconTile: { width: 68, height: 68, borderRadius: 15, alignItems: "center", justifyContent: "center" },
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
  legalBlock: { alignItems: "center", marginTop: 14 },
  legalIntro: { color: "#6B7690", fontSize: 11.5, lineHeight: 16, textAlign: "center" },
  legalLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", columnGap: 8 },
  legalJoiner: { color: "#6B7690", fontSize: 11.5, lineHeight: 22 },
  link: { color: "#134FC8", fontSize: 11.5, lineHeight: 22, fontWeight: "600", textDecorationLine: "underline" },
  linkPressed: { color: "#0E35AF", opacity: 0.7 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: spacing.radius, padding: spacing.card, gap: 16 },
  titleSmall: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.4 },
  body: { color: colors.slate, fontSize: 16, lineHeight: 24, textAlign: "center" },
});
