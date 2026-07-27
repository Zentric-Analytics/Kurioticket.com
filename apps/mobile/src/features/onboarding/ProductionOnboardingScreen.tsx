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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";

const TERMS_URL = "https://kurioticket.com/terms";
const PRIVACY_URL = "https://kurioticket.com/privacy";
const HERO_IMAGE = require("../../../assets/onboarding/kurioticket-mediterranean-hero.jpg");

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled: boolean;
  primary?: boolean;
  icon: ReactNode;
};

function ActionButton({ label, onPress, disabled, primary = false, icon }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary ? styles.primaryButton : styles.secondaryButton,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon}
        <Text style={primary ? styles.primaryButtonText : styles.secondaryButtonText}>{label}</Text>
      </View>
    </Pressable>
  );
}

function EnvelopeIcon({ color }: { color: string }) {
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width={25} height={25} viewBox="0 0 24 24">
      <Rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill="none" stroke={color} strokeWidth="1.9" />
      <Path d="m4 7 8 6 8-6" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PersonIcon() {
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width={25} height={25} viewBox="0 0 24 24">
      <Circle cx="12" cy="7" r="3.25" fill="none" stroke="#1764D9" strokeWidth="1.9" />
      <Path d="M5 20c.25-4.3 2.6-6.5 7-6.5s6.75 2.2 7 6.5H5Z" fill="none" stroke="#1764D9" strokeWidth="1.9" strokeLinejoin="round" />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width={42} height={42} viewBox="0 0 42 42">
      <Circle cx="18" cy="18" r="11.5" fill="none" stroke="#0E63D8" strokeWidth="2.2" />
      <Path d="m26.5 26.5 8.5 8.5" fill="none" stroke="#0E63D8" strokeWidth="2.4" strokeLinecap="round" />
      <Path d="M10.5 17a8.5 8.5 0 0 1 3-5.8" fill="none" stroke="#0E63D8" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

function BookmarkIcon() {
  return (
    <Svg width={42} height={42} viewBox="0 0 42 42">
      <Path d="M12 7.5h18v27L21 29l-9 5.5v-27Z" fill="none" stroke="#0BAA8B" strokeWidth="2.2" strokeLinejoin="round" />
    </Svg>
  );
}

function BellIcon() {
  return (
    <Svg width={42} height={42} viewBox="0 0 42 42">
      <Path d="M10.5 29.5h21l-2.8-4.1V19a7.7 7.7 0 0 0-15.4 0v6.4l-2.8 4.1Z" fill="none" stroke="#6A39C6" strokeWidth="2.2" strokeLinejoin="round" />
      <Path d="M17 34a4.2 4.2 0 0 0 8 0M21 8V5.5" fill="none" stroke="#6A39C6" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

type BenefitProps = {
  title: string;
  description: string;
  tileStyle: object;
  icon: ReactNode;
};

function Benefit({ title, description, tileStyle, icon }: BenefitProps) {
  return (
    <View accessible accessibilityLabel={`${title}. ${description}`} style={styles.benefitCard}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.iconTile, tileStyle]}>
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
  const open = () => {
    if (!url.startsWith("https://")) return;
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint="Opens in your browser" onPress={open} hitSlop={8}>
      {({ pressed }) => <Text style={[styles.legalLink, pressed && styles.legalLinkPressed]}>{label}</Text>}
    </Pressable>
  );
}

export function ProductionOnboardingScreen() {
  const [pendingAction, setPendingAction] = useState<"email" | "guest" | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = Math.min(320, Math.max(220, height * 0.31));

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotionEnabled) => {
        if (!mounted) return;
        if (reduceMotionEnabled) {
          entrance.setValue(1);
          return;
        }
        Animated.timing(entrance, { toValue: 1, duration: 300, useNativeDriver: true }).start();
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
    <View style={styles.screen}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <ImageBackground
          accessibilityIgnoresInvertColors
          accessible={false}
          source={HERO_IMAGE}
          resizeMode="cover"
          style={[styles.hero, { height: heroHeight }]}
          imageStyle={styles.heroImage}
        />

        <Animated.View
          style={[
            styles.panel,
            {
              opacity: entrance,
              transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <Text accessibilityRole="header" style={styles.headline}>
            Find better travel{"\n"}options <Text style={styles.headlineAccent}>in seconds</Text>
          </Text>
          <Text style={styles.supportingCopy}>
            Compare trusted providers, save your trips, and stay informed when prices change.
          </Text>

          <View style={styles.benefits}>
            <Benefit
              title="Compare trusted options"
              description="See travel choices from trusted providers in one place."
              tileStyle={styles.blueTile}
              icon={<SearchIcon />}
            />
            <Benefit
              title="Save your trips"
              description="Keep searches and travel plans organized across devices."
              tileStyle={styles.mintTile}
              icon={<BookmarkIcon />}
            />
            <Benefit
              title="Price alerts"
              description="Stay informed when prices change for trips you care about."
              tileStyle={styles.lavenderTile}
              icon={<BellIcon />}
            />
          </View>

          <View style={styles.actions}>
            <ActionButton
              label="Continue with Email"
              onPress={continueEmail}
              disabled={pendingAction !== null}
              primary
              icon={<EnvelopeIcon color="white" />}
            />
            <ActionButton
              label="Continue as Guest"
              onPress={continueGuest}
              disabled={pendingAction !== null}
              icon={<PersonIcon />}
            />
          </View>

          <View style={styles.legalBlock}>
            <Text style={styles.legalText}>By continuing, you agree to our </Text>
            <View style={styles.legalRow}>
              <LegalLink label="Terms of Service" url={TERMS_URL} />
              <Text style={styles.legalText}> and </Text>
              <LegalLink label="Privacy Policy" url={PRIVACY_URL} />
              <Text style={styles.legalText}>.</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" },
  scrollContent: { flexGrow: 1, backgroundColor: "white" },
  hero: { width: "100%", backgroundColor: "#65AEE4" },
  heroImage: { width: "100%", height: "100%" },
  panel: {
    flex: 1,
    marginTop: -28,
    paddingTop: 38,
    paddingHorizontal: 28,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: "white",
  },
  headline: {
    color: "#071A42",
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  headlineAccent: { color: "#1265E6" },
  supportingCopy: {
    color: "#667085",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400",
    marginTop: 13,
    maxWidth: 470,
  },
  benefits: { gap: 13, marginTop: 24 },
  benefitCard: {
    minHeight: 105,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E4E9F1",
    borderRadius: 17,
    backgroundColor: "white",
    shadowColor: "#15284D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  iconTile: { width: 72, height: 72, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  blueTile: { backgroundColor: "#E7F0FF" },
  mintTile: { backgroundColor: "#E2F7F1" },
  lavenderTile: { backgroundColor: "#F0E9FF" },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: "#071A42", fontSize: 17, lineHeight: 23, fontWeight: "800", letterSpacing: -0.2 },
  benefitDescription: { color: "#667085", fontSize: 14.5, lineHeight: 20.5, fontWeight: "400", marginTop: 4 },
  actions: { gap: 13, marginTop: 25 },
  actionButton: {
    minHeight: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButton: { backgroundColor: "#1064E8" },
  secondaryButton: { backgroundColor: "white", borderWidth: 1.5, borderColor: "#1764D9" },
  buttonPressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  buttonDisabled: { opacity: 0.55 },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  primaryButtonText: { color: "white", fontSize: 18, lineHeight: 24, fontWeight: "700" },
  secondaryButtonText: { color: "#1265E6", fontSize: 18, lineHeight: 24, fontWeight: "700" },
  legalBlock: { alignItems: "center", marginTop: 19 },
  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  legalText: { color: "#667085", fontSize: 12.5, lineHeight: 20, textAlign: "center" },
  legalLink: { color: "#1265E6", fontSize: 12.5, lineHeight: 20, fontWeight: "600", textDecorationLine: "underline" },
  legalLinkPressed: { opacity: 0.7 },
});
