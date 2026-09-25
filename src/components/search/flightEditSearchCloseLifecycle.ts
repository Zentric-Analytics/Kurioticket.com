export const FLIGHT_EDIT_SEARCH_CLOSE_DURATION_MS = 280;

type FlightEditSearchCloseOptions = {
  beginClosing: () => void;
  finishClose: () => void;
  schedule?: (callback: () => void, delay: number) => number;
};

/** Starts the visual close without disturbing resources owned by the mounted drawer. */
export function beginFlightEditSearchClose({
  beginClosing,
  finishClose,
  schedule = (callback, delay) => window.setTimeout(callback, delay),
}: FlightEditSearchCloseOptions): number {
  beginClosing();
  return schedule(finishClose, FLIGHT_EDIT_SEARCH_CLOSE_DURATION_MS);
}
