import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, InteractionManager, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { HOTEL_RESULTS_REVEAL_COUNT, initialHotelFilterScrollState, nextHotelFilterScrollState, nextHotelRevealLimit } from "./hotelResultsScroll";

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
  const pendingReveal = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const limit = window.identity === identity ? window.limit : HOTEL_RESULTS_REVEAL_COUNT;
  const hasMore = limit < total;

  const interactionHandle = useRef<number | null>(null);
  const dragEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endInteraction = useCallback(() => {
    if (dragEndTimer.current) clearTimeout(dragEndTimer.current);
    dragEndTimer.current = null;
    if (interactionHandle.current !== null) InteractionManager.clearInteractionHandle(interactionHandle.current);
    interactionHandle.current = null;
  }, []);
  const beginInteraction = useCallback(() => {
    if (dragEndTimer.current) clearTimeout(dragEndTimer.current);
    dragEndTimer.current = null;
    if (interactionHandle.current === null) interactionHandle.current = InteractionManager.createInteractionHandle();
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
    pendingReveal.current?.cancel();
    pendingReveal.current = null;
    setWindow({ identity, limit: HOTEL_RESULTS_REVEAL_COUNT });
    resetFilters();
    endInteraction();
    return () => {
      endInteraction();
      pendingReveal.current?.cancel();
      pendingReveal.current = null;
      filterTranslation.stopAnimation();
    };
  }, [identity, resetFilters, filterTranslation, endInteraction]);

  useEffect(() => {
    const animation = Animated.timing(filterTranslation, {
      toValue: filterHidden ? -filterHeight : 0,
      duration: 160,
      useNativeDriver: false,
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
    if (!hasMore || pendingReveal.current) return;
    const owner = identity;
    // Keep the existing cards and footer while a gesture is active; append a
    // bounded group once interaction work yields, without remounting the list.
    pendingReveal.current = InteractionManager.runAfterInteractions(() => {
      pendingReveal.current = null;
      if (owner !== currentIdentity.current) return;
      setWindow(previous => ({
        identity: owner,
        limit: nextHotelRevealLimit(previous.identity === owner ? previous.limit : HOTEL_RESULTS_REVEAL_COUNT, currentTotal.current),
      }));
    });
  }, [hasMore, identity]);

  const onFilterLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.ceil(event.nativeEvent.layout.height);
    if (height > 0) setFilterHeight(height);
  }, []);

  return { limit, hasMore, revealMore, beginInteraction, endDrag, endInteraction, onScroll, resetFilters, onFilterLayout, filterHeight, filterHidden, filterTranslation };
}
