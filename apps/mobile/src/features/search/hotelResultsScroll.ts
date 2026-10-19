export const HOTEL_RESULTS_REVEAL_COUNT = 24;
export const HOTEL_RESULTS_RENDER_WINDOW = 21;
export const HOTEL_RESULTS_BATCH_PERIOD = 16;
const DIRECTION_THRESHOLD = 12;

export type HotelFilterScrollState = {
  offset: number;
  travel: number;
  hidden: boolean;
};

export const initialHotelFilterScrollState = (): HotelFilterScrollState => ({ offset: 0, travel: 0, hidden: false });

/** Clamp bounce/viewport changes before interpreting movement as user intent. */
export function nextHotelFilterScrollState(
  previous: HotelFilterScrollState,
  offset: number,
  maximumOffset: number,
): HotelFilterScrollState {
  const y = Math.max(0, Math.min(offset, Math.max(0, maximumOffset)));
  if (y <= 4) return initialHotelFilterScrollState();
  // Collapsing the filter rail enlarges the list viewport. Native clamping at
  // its new end is a layout adjustment, not an upward gesture.
  if (previous.offset > maximumOffset && y === Math.max(0, maximumOffset)) {
    return { ...previous, offset: y };
  }
  const delta = y - previous.offset;
  const travel = Math.sign(delta) === Math.sign(previous.travel)
    ? previous.travel + delta
    : delta;
  const hidden = travel >= DIRECTION_THRESHOLD ? true
    : travel <= -DIRECTION_THRESHOLD ? false : previous.hidden;
  return { offset: y, travel: hidden !== previous.hidden ? 0 : travel, hidden };
}

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
