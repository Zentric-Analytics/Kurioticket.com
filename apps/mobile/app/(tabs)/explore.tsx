import { useCallback, useEffect, useRef, useState } from "react";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { ParamListBase } from "@react-navigation/native";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";
import { ExploreScreen } from "../../src/features/explore/ExploreScreen";
import { FlowIcon } from "../../src/features/flow/FlowIcon";

const NAVY = "#071A48";
const BLUE = "#0754F7";
const ENTRY_DURATION_MS = 3000;
const ENTRY_FADE_DURATION_MS = 400;
const ENTRY_FADE_DELAY_MS = ENTRY_DURATION_MS;
const SWEEP_DURATION_MS = 700;

export default function ExploreTab() {
  const navigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();
  const [showEntry, setShowEntry] = useState(true);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const entryRequested = useRef(true);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0.82)).current;
  const contentTranslateY = useRef(new Animated.Value(8)).current;
  const glowScale = useRef(new Animated.Value(0.88)).current;
  const glowOpacity = useRef(new Animated.Value(0.28)).current;
  const sweepTranslateX = useRef(new Animated.Value(-180)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return navigation.addListener("tabPress", () => {
      if (!navigation.isFocused()) {
        entryRequested.current = true;
        overlayOpacity.setValue(1);
        contentOpacity.setValue(0.82);
        contentTranslateY.setValue(8);
        glowScale.setValue(0.88);
        glowOpacity.setValue(0.28);
        sweepTranslateX.setValue(-180);
        setShowEntry(true);
      }
    });
  }, [
    contentOpacity,
    contentTranslateY,
    glowOpacity,
    glowScale,
    navigation,
    overlayOpacity,
    sweepTranslateX,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion === null) return undefined;

      if (!entryRequested.current) {
        overlayOpacity.setValue(0);
        contentOpacity.setValue(1);
        contentTranslateY.setValue(0);
        setShowEntry(false);
        return undefined;
      }

      entryRequested.current = false;

      if (reduceMotion) {
        overlayOpacity.setValue(0);
        contentOpacity.setValue(1);
        contentTranslateY.setValue(0);
        setShowEntry(false);
        return undefined;
      }

      overlayOpacity.setValue(1);
      contentOpacity.setValue(0.82);
      contentTranslateY.setValue(8);
      glowScale.setValue(0.88);
      glowOpacity.setValue(0.28);
      sweepTranslateX.setValue(-180);
      setShowEntry(true);

      const sweep = Animated.loop(
        Animated.timing(sweepTranslateX, {
          toValue: 180,
          duration: SWEEP_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      );

      const reveal = Animated.parallel([
        Animated.timing(glowScale, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.48,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.2,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      const fade = Animated.sequence([
        Animated.delay(ENTRY_FADE_DELAY_MS),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: ENTRY_FADE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      sweep.start();
      reveal.start();
      fade.start(({ finished }) => {
        if (finished) {
          sweep.stop();
          setShowEntry(false);
        }
      });

      return () => {
        sweep.stop();
        reveal.stop();
        fade.stop();
      };
    }, [
      contentOpacity,
      contentTranslateY,
      glowOpacity,
      glowScale,
      overlayOpacity,
      reduceMotion,
      sweepTranslateX,
    ]),
  );

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.content, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }]}>
        <ExploreScreen />
      </Animated.View>
      {showEntry ? (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="auto"
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
          <View style={styles.centerpiece}>
            <View style={styles.iconShell}>
              <FlowIcon name="compass" size={34} color={BLUE} />
            </View>
            <Text style={styles.eyebrow}>KURIOTICKET EXPLORE</Text>
            <Text style={styles.loadingTitle}>Discovering your next destination</Text>
            <View style={styles.track}>
              <Animated.View style={[styles.sweep, { transform: [{ translateX: sweepTranslateX }] }]} />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFBFF" },
  content: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FAFBFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#DCE8FF",
  },
  centerpiece: { width: "78%", maxWidth: 360, alignItems: "center" },
  iconShell: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D9E5FF",
    shadowColor: NAVY,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginBottom: 18,
  },
  eyebrow: { color: BLUE, fontSize: 11, letterSpacing: 1.6, fontWeight: "800", marginBottom: 8 },
  loadingTitle: { color: NAVY, fontSize: 22, lineHeight: 29, fontWeight: "800", textAlign: "center" },
  track: { width: 164, height: 4, borderRadius: 2, backgroundColor: "#E4EBF8", overflow: "hidden", marginTop: 22 },
  sweep: { width: 76, height: 4, borderRadius: 2, backgroundColor: BLUE },
});
