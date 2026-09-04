import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchLoadingPresentation, type SearchLoadingProduct } from "../../../../../src/shared/presentation/searchLoadingPresentation";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";

export function NativeTravelSearchLoadingScreen({ product }: { product: SearchLoadingProduct }) {
  const { locale, direction } = useMobileLocalization();
  const { theme } = useAppTheme();
  const presentation = searchLoadingPresentation(product, locale);
  const alignment = direction === "rtl" ? "right" : "center";
  const [messageIndex, setMessageIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    setMessageIndex(0);
    if (reduceMotion) return;
    const timer = setInterval(() => setMessageIndex((current) => (current + 1) % presentation.messages.length), 1_800);
    return () => clearInterval(timer);
  }, [presentation.messages, product, reduceMotion]);

  useEffect(() => {
    pulse.stopAnimation();
    progress.stopAnimation();
    if (reduceMotion) {
      pulse.setValue(0);
      progress.setValue(0.45);
      return;
    }
    pulse.setValue(0);
    progress.setValue(0.08);
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1_350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1_350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const progressAnimation = Animated.timing(progress, { toValue: 0.92, duration: 14_000, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    pulseLoop.start();
    progressAnimation.start();
    return () => { pulseLoop.stop(); progressAnimation.stop(); };
  }, [progress, pulse, reduceMotion]);

  const message = presentation.messages[messageIndex % presentation.messages.length];
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return <SafeAreaView
    style={[styles.safe, { backgroundColor: theme.dark ? theme.background : "#F7FAFF" }]}
    accessibilityRole="progressbar"
    accessibilityState={{ busy: true }}
    accessibilityLabel={`${presentation.title}. ${message}`}
    accessibilityLiveRegion="polite"
  >
    <View style={styles.content}>
      <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }}>
        <Image
        source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessible={false}
        style={styles.logo}
        />
      </Animated.View>
      <View style={styles.track} accessible={false}>
        <Animated.View style={[styles.progress, { width: progressWidth }]} />
      </View>
      <Text style={[styles.title, { color: theme.textPrimary, textAlign: alignment }]}>{presentation.title}</Text>
      <Text style={[styles.supporting, { color: theme.textSecondary, textAlign: alignment }]}>{message}</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: "center" },
  content: { alignItems: "center", alignSelf: "center", width: "100%", maxWidth: 420, paddingHorizontal: 32, transform: [{ translateY: -16 }] },
  logo: { width: 194, height: 56 },
  track: { width: "100%", maxWidth: 286, height: 4, marginTop: 28, overflow: "hidden", borderRadius: 2, backgroundColor: "rgba(0,75,184,0.10)" },
  progress: { height: "100%", borderRadius: 2, backgroundColor: "#2B8FCB" },
  title: { width: "100%", marginTop: 22, fontSize: 21, lineHeight: 28, fontWeight: "800" },
  supporting: { width: "100%", marginTop: 11, fontSize: 15, lineHeight: 22 },
});
