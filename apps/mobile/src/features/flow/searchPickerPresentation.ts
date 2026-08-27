import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

export const SEARCH_PICKER_BACKDROP_COLOR = "rgba(8, 18, 35, 0.20)";
export const SEARCH_PICKER_OPEN_DURATION_MS = 220;
export const SEARCH_PICKER_CLOSE_DURATION_MS = 180;
export const SEARCH_PICKER_SHEET_OFFSET = 40;

/** Keeps the transparent Modal fixed while its scrim and sheet animate independently. */
export function useSearchPickerMotion(visible: boolean) {
  const [rendered, setRendered] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SEARCH_PICKER_SHEET_OFFSET)).current;
  const generation = useRef(0);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    backdropOpacity.stopAnimation();
    sheetTranslateY.stopAnimation();

    if (visible) {
      setRendered(true);
      const frame = requestAnimationFrame(() => {
        if (generation.current !== currentGeneration) return;
        Animated.parallel([
          Animated.timing(backdropOpacity, { toValue: 1, duration: SEARCH_PICKER_OPEN_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(sheetTranslateY, { toValue: 0, duration: SEARCH_PICKER_OPEN_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: SEARCH_PICKER_CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: SEARCH_PICKER_SHEET_OFFSET, duration: SEARCH_PICKER_CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && generation.current === currentGeneration) setRendered(false);
      });
    }

    return () => {
      backdropOpacity.stopAnimation();
      sheetTranslateY.stopAnimation();
    };
  }, [backdropOpacity, rendered, sheetTranslateY, visible]);

  return {
    rendered,
    backdropStyle: { opacity: backdropOpacity },
    sheetStyle: { transform: [{ translateY: sheetTranslateY }] },
  } as const;
}
