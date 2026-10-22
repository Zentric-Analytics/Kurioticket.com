import { useCallback, useEffect, useRef, useState } from "react";
import { HOTEL_RESULTS_REVEAL_COUNT, createHotelRevealGate, nextHotelRevealLimit } from "./hotelResultsScroll";

/** Hotel-only reveal window. Filters remain fixed above the native list. */
export function useHotelResultsScrolling(identity: string, total: number) {
  const [window, setWindow] = useState({ identity, limit: HOTEL_RESULTS_REVEAL_COUNT });
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
    // Momentum begins after release; otherwise finish the drag without waiting
    // for a momentum-end event that will never arrive.
    if (dragEndTimer.current) clearTimeout(dragEndTimer.current);
    dragEndTimer.current = setTimeout(endInteraction, 80);
  }, [endInteraction]);

  useEffect(() => {
    revealGate.current?.reset();
    setWindow({ identity, limit: HOTEL_RESULTS_REVEAL_COUNT });
    endInteraction();
    return () => {
      endInteraction();
      revealGate.current?.reset();
    };
  }, [identity, endInteraction]);

  const revealMore = useCallback(() => {
    if (hasMore) revealGate.current?.request(identity);
  }, [hasMore, identity]);

  return { limit, hasMore, revealMore, beginInteraction, endDrag, endInteraction };
}
