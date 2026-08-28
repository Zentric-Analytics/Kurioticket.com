import { useEffect, useRef, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { FlightSearchPanel } from "../flow/FlightSearchPanel";
import type { RouteValue } from "../flow/flightSearchModel";
import { useFlowTheme } from "../flow/flowStyles";
import { useRetainedPickerContext } from "../flow/retainedPickerContext";

const EDIT_SEARCH_REVEAL_OFFSET = -36;
const EDIT_SEARCH_OPEN_DURATION_MS = 240;
const EDIT_SEARCH_CLOSE_DURATION_MS = 220;

function useFlightEditSearchMotion(visible: boolean) {
  const [rendered, setRendered] = useState(visible);
  const renderedRef = useRef(false);
  const generation = useRef(0);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(EDIT_SEARCH_REVEAL_OFFSET)).current;

  useEffect(() => {
    const currentGeneration = ++generation.current;
    backdropOpacity.stopAnimation();
    panelTranslateY.stopAnimation();

    if (visible) {
      const continuingInterruptedMotion = renderedRef.current;
      renderedRef.current = true;
      setRendered(true);
      if (!continuingInterruptedMotion) {
        backdropOpacity.setValue(0);
        panelTranslateY.setValue(EDIT_SEARCH_REVEAL_OFFSET);
      }
      const frame = requestAnimationFrame(() => {
        if (generation.current !== currentGeneration) return;
        Animated.parallel([
          Animated.timing(backdropOpacity, { toValue: 1, duration: EDIT_SEARCH_OPEN_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(panelTranslateY, { toValue: 0, duration: EDIT_SEARCH_OPEN_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (!renderedRef.current) return;
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: EDIT_SEARCH_CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(panelTranslateY, { toValue: EDIT_SEARCH_REVEAL_OFFSET, duration: EDIT_SEARCH_CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && generation.current === currentGeneration) {
        renderedRef.current = false;
        setRendered(false);
      }
    });
  }, [visible, backdropOpacity, panelTranslateY]);

  return {
    rendered,
    pointerEvents: visible ? "auto" : "none",
    backdropStyle: { opacity: backdropOpacity },
    panelStyle: { transform: [{ translateY: panelTranslateY }] },
  } as const;
}

type Props = {
  visible: boolean;
  params: Record<string, RouteValue>;
  topInset: number;
  onClose: () => void;
};

export function FlightEditSearchModal({ visible, params, topInset, onClose }: Props) {
  const ft = useFlowTheme();
  const motion = useFlightEditSearchMotion(visible);
  const presentedParams = useRetainedPickerContext(visible, params);
  if (!motion.rendered) return null;

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView pointerEvents={motion.pointerEvents} style={styles.viewport} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.safeAreaClearance, { height: topInset }]} />
        <View style={styles.backdrop}>
          <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.scrim, motion.backdropStyle]} />
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close edit search" onPress={onClose} />
          <Animated.View accessibilityViewIsModal style={[styles.panel, { backgroundColor: ft.colors.surface }, motion.panelStyle]}>
            <View style={[styles.header, { borderBottomColor: ft.colors.border }]}>
              <Text accessibilityRole="header" style={[ft.styles.title, styles.title]}>Change your search</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close edit search" hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.close, pressed && ft.styles.pressed]}>
                <X accessible={false} size={23} color={ft.colors.icon} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
              <FlightSearchPanel embedded params={presentedParams} submitNavigation="replace" onBeforeNavigate={onClose} editAppearance />
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  safeAreaClearance: { flexShrink: 0 },
  backdrop: { flex: 1, justifyContent: "flex-start" },
  scrim: { backgroundColor: "rgba(8, 18, 35, 0.52)" },
  panel: { maxHeight: "100%", borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingLeft: 16, paddingRight: 8 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "left", fontSize: 19, lineHeight: 24 },
  content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 },
});
