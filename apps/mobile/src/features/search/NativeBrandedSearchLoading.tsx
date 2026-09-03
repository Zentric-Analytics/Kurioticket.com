import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SEARCH_LOADING_ROTATION_MS,
  searchLoadingPresentation,
  type SearchLoadingProduct,
} from "../../../../../src/shared/presentation/searchLoadingPresentation";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";
import { colors } from "../../theme/tokens";

export function NativeBrandedSearchLoading({ product }: { product: SearchLoadingProduct }) {
  const { locale, direction } = useMobileLocalization();
  const { theme } = useAppTheme();
  const presentation = useMemo(() => searchLoadingPresentation(product, locale), [locale, product]);
  const [messageIndex, setMessageIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const breathe = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMessageIndex(0);
    const timer = setInterval(() => setMessageIndex((current) => (current + 1) % presentation.messages.length), SEARCH_LOADING_ROTATION_MS);
    return () => clearInterval(timer);
  }, [presentation]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setReduceMotion(value));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    breathe.stopAnimation();
    progress.stopAnimation();
    if (reduceMotion) { breathe.setValue(0); progress.setValue(0.25); return; }
    const logoAnimation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1_400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1_400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    const progressAnimation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 1_400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 1_400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    logoAnimation.start(); progressAnimation.start();
    return () => { logoAnimation.stop(); progressAnimation.stop(); };
  }, [breathe, progress, reduceMotion]);

  const message = presentation.messages[messageIndex % presentation.messages.length];
  return <SafeAreaView
    style={[styles.safe, { backgroundColor: theme.background }]}
    accessibilityRole="progressbar"
    accessibilityState={{ busy: true }}
    accessibilityLabel={`${presentation.title}. ${message}`}
    accessibilityLiveRegion="polite"
  >
    <View pointerEvents="none" style={[styles.glow, styles.glowLeft, { backgroundColor: theme.dark ? "rgba(44,160,154,0.10)" : "rgba(92,182,178,0.08)" }]} />
    <View pointerEvents="none" style={[styles.glow, styles.glowRight, { backgroundColor: theme.dark ? "rgba(26,102,232,0.14)" : "rgba(0,75,184,0.07)" }]} />
    <View style={styles.content}>
      <Animated.View style={{ opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }), transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.02] }) }] }}>
        <Image source={require("../../../assets/kurioticket-logo-primary-light-bg.png")} resizeMode="contain" accessibilityIgnoresInvertColors style={styles.logo} />
      </Animated.View>
      <View style={[styles.track, { backgroundColor: theme.dark ? "rgba(117,174,255,0.16)" : "rgba(0,75,184,0.08)" }]}>
        <Animated.View style={[styles.line, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-150, 150] }) }] }]} />
      </View>
      <Text style={[styles.title, { color: theme.textPrimary, textAlign: direction === "rtl" ? "right" : "center" }]}>{presentation.title}</Text>
      <Text style={[styles.message, { color: theme.textSecondary, textAlign: direction === "rtl" ? "right" : "center" }]}>{message}</Text>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {[0, 1, 2].map((index) => <View key={index} style={[styles.dot, { backgroundColor: index === messageIndex % 3 ? colors.blue : theme.border }]} />)}
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, overflow: "hidden", justifyContent: "center" },
  content: { alignItems: "center", alignSelf: "center", width: "100%", maxWidth: 420, paddingHorizontal: 32 },
  logo: { width: 198, height: 58 },
  track: { width: 248, height: 4, marginTop: 30, borderRadius: 999, overflow: "hidden" },
  line: { width: 124, height: 4, borderRadius: 999, backgroundColor: colors.blue },
  title: { marginTop: 22, fontSize: 22, lineHeight: 29, fontWeight: "800", width: "100%" },
  message: { marginTop: 9, fontSize: 15, lineHeight: 23, width: "100%" },
  dots: { flexDirection: "row", gap: 8, marginTop: 22 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  glow: { position: "absolute", width: 260, height: 260, borderRadius: 130 },
  glowLeft: { left: -150, top: 90 },
  glowRight: { right: -165, bottom: 70 },
});
