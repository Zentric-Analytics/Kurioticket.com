import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

export const SEARCH_PICKER_BACKDROP_COLOR = "rgba(8, 18, 35, 0.20)";
export const SEARCH_PICKER_OPEN_DURATION_MS = 220;
export const SEARCH_PICKER_CLOSE_DURATION_MS = 180;
export const SEARCH_PICKER_SHEET_OFFSET = 40;

export function useSearchPickerMotion(visible: boolean) {
  const [rendered, setRendered] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const sheetTranslateY = useRef(new Animated.Value(visible ? 0 : SEARCH_PICKER_SHEET_OFFSET)).current;
  const generation = useRef(0);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    backdropOpacity.stopAnimation();
    sheetTranslateY.stopAnimation();

    if (visible) {
      setRendered(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(SEARCH_PICKER_SHEET_OFFSET);
      const frame = requestAnimationFrame(() => {
        if (generation.current !== currentGeneration) return;
        Animated.parallel([
          Animated.timing(backdropOpacity, { toValue: 1, duration: SEARCH_PICKER_OPEN_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(sheetTranslateY, { toValue: 0, duration: SEARCH_PICKER_OPEN_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (!rendered) return;
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: SEARCH_PICKER_CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: SEARCH_PICKER_SHEET_OFFSET, duration: SEARCH_PICKER_CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && generation.current === currentGeneration) setRendered(false);
    });
  }, [visible, rendered, backdropOpacity, sheetTranslateY]);

  return {
    rendered,
    interactive: visible,
    pointerEvents: visible ? "auto" : "none",
    backdropStyle: { opacity: backdropOpacity },
    sheetStyle: { transform: [{ translateY: sheetTranslateY }] },
  } as const;
}
