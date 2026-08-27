import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, useWindowDimensions } from "react-native";

export const SEARCH_PICKER_BACKDROP_COLOR = "rgba(8, 18, 35, 0.20)";
export const SEARCH_PICKER_OPEN_DURATION_MS = 280;
export const SEARCH_PICKER_CLOSE_DURATION_MS = 240;

export function searchPickerSheetTravelDistance(windowHeight: number, screenHeight = Dimensions.get("screen").height) {
  return Math.max(windowHeight, screenHeight);
}

export function useSearchPickerMotion(visible: boolean) {
  const { height: windowHeight } = useWindowDimensions();
  const sheetTravelDistance = searchPickerSheetTravelDistance(windowHeight);
  const [rendered, setRendered] = useState(visible);
  const renderedRef = useRef(visible);
  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const sheetTranslateY = useRef(new Animated.Value(visible ? 0 : sheetTravelDistance)).current;
  const generation = useRef(0);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    backdropOpacity.stopAnimation();
    sheetTranslateY.stopAnimation();

    if (visible) {
      const continuingInterruptedMotion = renderedRef.current;
      renderedRef.current = true;
      setRendered(true);
      if (!continuingInterruptedMotion) {
        backdropOpacity.setValue(0);
        sheetTranslateY.setValue(sheetTravelDistance);
      }
      const frame = requestAnimationFrame(() => {
        if (generation.current !== currentGeneration) return;
        Animated.parallel([
          Animated.timing(backdropOpacity, { toValue: 1, duration: SEARCH_PICKER_OPEN_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(sheetTranslateY, { toValue: 0, duration: SEARCH_PICKER_OPEN_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (!renderedRef.current) return;
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: SEARCH_PICKER_CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: sheetTravelDistance, duration: SEARCH_PICKER_CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && generation.current === currentGeneration) {
        renderedRef.current = false;
        setRendered(false);
      }
    });
  }, [visible, sheetTravelDistance, backdropOpacity, sheetTranslateY]);

  return {
    rendered,
    interactive: visible,
    pointerEvents: visible ? "auto" : "none",
    backdropStyle: { opacity: backdropOpacity },
    sheetStyle: { transform: [{ translateY: sheetTranslateY }] },
  } as const;
}
