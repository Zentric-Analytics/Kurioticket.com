export const HOTEL_RESULTS_REVEAL_COUNT = 24;
export const HOTEL_RESULTS_RENDER_WINDOW = 21;
export const HOTEL_RESULTS_BATCH_PERIOD = 16;
export function nextHotelRevealLimit(current: number, total: number) {
  return Math.min(total, current + HOTEL_RESULTS_REVEAL_COUNT);
}

/** This gate defers only our next reveal. Global interaction handles would also
 * block VirtualizedList's own render batches during momentum. */
export function createHotelRevealGate(
  schedule: (task: () => void) => () => void,
  reveal: (identity: string) => void,
) {
  let scrolling = false;
  let pending: string | null = null;
  let cancel: (() => void) | null = null;
  let generation = 0;
  const flush = () => {
    if (scrolling || pending === null || cancel) return;
    const owner = generation;
    cancel = schedule(() => {
      if (owner !== generation) return;
      cancel = null;
      if (scrolling || pending === null) return;
      const identity = pending;
      pending = null;
      reveal(identity);
    });
  };
  return {
    begin() { scrolling = true; },
    end() { scrolling = false; flush(); },
    request(identity: string) { pending = identity; flush(); },
    reset() {
      generation++;
      cancel?.();
      cancel = null;
      pending = null;
      scrolling = false;
    },
  };
}
