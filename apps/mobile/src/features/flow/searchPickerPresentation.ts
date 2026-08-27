import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, type LayoutChangeEvent, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { searchPickerSheetTravelDistance } from "./searchPickerTravel";

export const SEARCH_PICKER_BACKDROP_COLOR = "rgba(8, 18, 35, 0.20)";
export const SEARCH_PICKER_OPEN_DURATION_MS = 280;
export const SEARCH_PICKER_CLOSE_DURATION_MS = 240;

export function useSearchPickerMotion(visible: boolean) {
  const { height: windowHeight } = useWindowDimensions();
  const { bottom: bottomSafeAreaInset } = useSafeAreaInsets();
  const fallbackTravelDistance = searchPickerSheetTravelDistance(windowHeight, undefined, Dimensions.get("screen").height);
  const [rendered, setRendered] = useState(visible);
  const renderedRef = useRef(false);
  const measuredSheetHeight = useRef<number | undefined>(undefined);
  const fallbackTravelDistanceRef = useRef(fallbackTravelDistance);
  const bottomSafeAreaInsetRef = useRef(bottomSafeAreaInset);
  const awaitingFreshOpenLayout = useRef(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(fallbackTravelDistance)).current;
  const generation = useRef(0);

  fallbackTravelDistanceRef.current = fallbackTravelDistance;
  bottomSafeAreaInsetRef.current = bottomSafeAreaInset;

  const currentTravelDistance = useCallback(
    () => searchPickerSheetTravelDistance(fallbackTravelDistanceRef.current, measuredSheetHeight.current, fallbackTravelDistanceRef.current, bottomSafeAreaInsetRef.current),
    [],
  );

  const onSheetLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
    measuredSheetHeight.current = nextHeight;

    // A fresh sheet is still wholly below the viewport before its first RAF.
    // Replacing the safety fallback here avoids invisible pre-travel without
    // moving a resting, closing, or interrupted visible sheet.
    if (awaitingFreshOpenLayout.current) sheetTranslateY.setValue(currentTravelDistance());
  }, [currentTravelDistance, sheetTranslateY]);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    backdropOpacity.stopAnimation();
    sheetTranslateY.stopAnimation();

    if (visible) {
      const continuingInterruptedMotion = renderedRef.current;
      renderedRef.current = true;
      setRendered(true);
      if (!continuingInterruptedMotion) {
        awaitingFreshOpenLayout.current = true;
        backdropOpacity.setValue(0);
        sheetTranslateY.setValue(currentTravelDistance());
      }
      const frame = requestAnimationFrame(() => {
        if (generation.current !== currentGeneration) return;
        awaitingFreshOpenLayout.current = false;
        Animated.parallel([
          Animated.timing(backdropOpacity, { toValue: 1, duration: SEARCH_PICKER_OPEN_DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(sheetTranslateY, { toValue: 0, duration: SEARCH_PICKER_OPEN_DURATION_MS, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
        ]).start();
      });
      return () => {
        awaitingFreshOpenLayout.current = false;
        cancelAnimationFrame(frame);
      };
    }

    if (!renderedRef.current) return;
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: SEARCH_PICKER_CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: currentTravelDistance(), duration: SEARCH_PICKER_CLOSE_DURATION_MS, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && generation.current === currentGeneration) {
        renderedRef.current = false;
        setRendered(false);
      }
    });
  }, [visible, backdropOpacity, currentTravelDistance, sheetTranslateY]);

  return {
    rendered,
    interactive: visible,
    pointerEvents: visible ? "auto" : "none",
    backdropStyle: { opacity: backdropOpacity },
    sheetStyle: { transform: [{ translateY: sheetTranslateY }] },
    onSheetLayout,
  } as const;
}
