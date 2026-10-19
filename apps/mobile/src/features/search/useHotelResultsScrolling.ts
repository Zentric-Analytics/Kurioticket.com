import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { HOTEL_RESULTS_REVEAL_COUNT, createHotelRevealGate, initialHotelFilterScrollState, nextHotelFilterScrollState, nextHotelRevealLimit } from "./hotelResultsScroll";

/** Hotel-only presentation window; the complete canonical inventory stays in the screen. */
export function useHotelResultsScrolling(identity: string, total: number) {
  const [window, setWindow] = useState({ identity, limit: HOTEL_RESULTS_REVEAL_COUNT });
  const [filterHidden, setFilterHidden] = useState(false);
  const [filterHeight, setFilterHeight] = useState(56);
  const filterTranslation = useRef(new Animated.Value(0)).current;
  const scrollState = useRef(initialHotelFilterScrollState());
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const currentTotal = useRef(total);
  currentTotal.current = total;
  const revealGate = useRef<ReturnType<typeof createHotelRevealGate> | null>(null);
  if (!revealGate.current) {
    revealGate.current = createHotelRevealGate(task => {
      const frame = requestAnimationFrame(task);
      return () => cancelAnimationFrame(frame);
    }, owner => {
      if (owner !== currentIdentity.current) return;
      setWindow(previous => ({
        identity: owner,
        limit: nextHotelRevealLimit(previous.identity === owner ? previous.limit : HOTEL_RESULTS_REVEAL_COUNT, currentTotal.current),
      }));
    });
  }
  const limit = window.identity === identity ? window.limit : HOTEL_RESULTS_REVEAL_COUNT;
  const hasMore = limit < total;

  const dragEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endInteraction = useCallback(() => {
    if (dragEndTimer.current) clearTimeout(dragEndTimer.current);
    dragEndTimer.current = null;
    revealGate.current?.end();
  }, []);
  const beginInteraction = useCallback(() => {
    if (dragEndTimer.current) clearTimeout(dragEndTimer.current);
    dragEndTimer.current = null;
    revealGate.current?.begin();
  }, []);
  const endDrag = useCallback(() => {
    // A release may start native momentum. Keep the reveal gate until its end;
    // a non-flinging drag releases it after the momentum-begin event window.
    if (dragEndTimer.current) clearTimeout(dragEndTimer.current);
    dragEndTimer.current = setTimeout(endInteraction, 80);
  }, [endInteraction]);

  const resetFilters = useCallback(() => {
    scrollState.current = initialHotelFilterScrollState();
    setFilterHidden(false);
    filterTranslation.stopAnimation();
    filterTranslation.setValue(0);
  }, [filterTranslation]);

  useEffect(() => {
    revealGate.current?.reset();
    setWindow({ identity, limit: HOTEL_RESULTS_REVEAL_COUNT });
    resetFilters();
    endInteraction();
    return () => {
      endInteraction();
      revealGate.current?.reset();
      filterTranslation.stopAnimation();
    };
  }, [identity, resetFilters, filterTranslation, endInteraction]);

  useEffect(() => {
    const animation = Animated.timing(filterTranslation, {
      toValue: filterHidden ? -filterHeight : 0,
      duration: 160,
      useNativeDriver: false,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [filterHeight, filterHidden, filterTranslation]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const previous = scrollState.current;
    const next = nextHotelFilterScrollState(previous, contentOffset.y, contentSize.height - layoutMeasurement.height);
    scrollState.current = next;
    if (previous.hidden !== next.hidden) setFilterHidden(next.hidden);
  }, []);

  const revealMore = useCallback(() => {
    if (hasMore) revealGate.current?.request(identity);
  }, [hasMore, identity]);

  const onFilterLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.ceil(event.nativeEvent.layout.height);
    if (height > 0) setFilterHeight(height);
  }, []);

  return { limit, hasMore, revealMore, beginInteraction, endDrag, endInteraction, onScroll, resetFilters, onFilterLayout, filterHeight, filterHidden, filterTranslation };
}
