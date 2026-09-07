export const FLIGHT_QUICK_CONTROL_TAP_SLOP = 10;
export const FLIGHT_QUICK_CONTROL_MAX_TAP_DURATION_MS = 500;

export type FlightQuickControlTouch = {
  pageX: number;
  pageY: number;
  timestamp: number;
};

export function isFlightQuickControlTap(
  start: FlightQuickControlTouch,
  end: FlightQuickControlTouch,
): boolean {
  return end.timestamp - start.timestamp <= FLIGHT_QUICK_CONTROL_MAX_TAP_DURATION_MS
    && Math.abs(end.pageX - start.pageX) <= FLIGHT_QUICK_CONTROL_TAP_SLOP
    && Math.abs(end.pageY - start.pageY) <= FLIGHT_QUICK_CONTROL_TAP_SLOP;
}
