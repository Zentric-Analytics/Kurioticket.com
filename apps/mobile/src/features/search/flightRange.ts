import type { NumericRange } from "./flightFilters";

const finite = (value: number) => Number.isFinite(value);
export const THUMB_HIT_SIZE = 44;
export const THUMB_CENTER_INSET = THUMB_HIT_SIZE / 2;

export function usableRangeTrackWidth(componentWidth: number): number {
  return finite(componentWidth) ? Math.max(0, componentWidth - THUMB_HIT_SIZE) : 0;
}

/** Returns a finite, ordered selection inside the available range. Invalid edges fall back to the matching extent edge. */
export function clampNumericRange(selected: NumericRange | null | undefined, available: NumericRange): NumericRange {
  const availableMin = finite(available.min) ? available.min : 0;
  const availableMax = finite(available.max) ? Math.max(availableMin, available.max) : availableMin;
  const min = finite(selected?.min ?? Number.NaN)
    ? Math.min(availableMax, Math.max(availableMin, selected!.min))
    : availableMin;
  const max = finite(selected?.max ?? Number.NaN)
    ? Math.min(availableMax, Math.max(availableMin, selected!.max))
    : availableMax;
  return min <= max ? { min, max } : { min: max, max };
}

/** Aim for roughly 50 useful positions, rounded to a human-friendly 1/2/5 × power-of-ten step. */
export function rangeStepForSpan(min: number, max: number): number {
  const span = max - min;
  if (!finite(span) || span <= 0) return 1;
  const rough = span / 50;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Price labels display whole currency units, so their slider step must do the same. */
export function priceRangeStep(min: number, max: number): number {
  return Math.max(1, rangeStepForSpan(min, max));
}

export function snapRangeValue(value: number, available: NumericRange, step: number): number {
  if (!finite(value)) return available.min;
  const safeStep = finite(step) && step > 0 ? step : 1;
  const snapped = available.min + Math.round((value - available.min) / safeStep) * safeStep;
  return Math.min(available.max, Math.max(available.min, snapped));
}

export function positionForRangeValue(value: number, available: NumericRange, width: number): number {
  const span = available.max - available.min;
  const trackWidth = usableRangeTrackWidth(width);
  if (trackWidth <= 0 || !finite(span) || span <= 0) return THUMB_CENTER_INSET;
  return THUMB_CENTER_INSET + Math.min(trackWidth, Math.max(0, ((value - available.min) / span) * trackWidth));
}

export function rangeValueForPosition(position: number, available: NumericRange, width: number, step: number): number {
  const span = available.max - available.min;
  const trackWidth = usableRangeTrackWidth(width);
  if (!finite(position) || trackWidth <= 0 || !finite(span) || span <= 0) return available.min;
  // Physical endpoints must restore the exact extent even when the span is not divisible by the step.
  if (position <= THUMB_CENTER_INSET) return available.min;
  if (position >= THUMB_CENTER_INSET + trackWidth) return available.max;
  return snapRangeValue(available.min + ((position - THUMB_CENTER_INSET) / trackWidth) * span, available, step);
}

/** Resolves a gesture from its local grant coordinate, never from a thumb's previous value. */
export function rangeValueForGesture(grantX: number, deltaX: number, available: NumericRange, width: number, step: number): number {
  const safeDelta = finite(deltaX) ? deltaX : 0;
  return rangeValueForPosition(grantX + safeDelta, available, width, step);
}

/** At an overlap, drag direction determines which edge can move away from the shared value. */
export function rangeEdgeForDrag(selected: NumericRange, requested: "min" | "max", deltaX: number): "min" | "max" {
  if (selected.min !== selected.max || deltaX === 0 || !finite(deltaX)) return requested;
  return deltaX < 0 ? "min" : "max";
}

/** Resolves an overlapping gesture once; a non-null locked edge is never reconsidered. */
export function lockedRangeEdgeForDrag(locked: "min" | "max" | null, overlappedAtGrant: boolean, requested: "min" | "max", deltaX: number) {
  if (locked) return locked;
  if (!overlappedAtGrant) return requested;
  if (!finite(deltaX) || deltaX === 0) return null;
  return deltaX < 0 ? "min" : "max";
}

export function moveRangeEdge(selected: NumericRange, edge: "min" | "max", value: number, available: NumericRange): NumericRange {
  const current = clampNumericRange(selected, available);
  const next = Math.min(available.max, Math.max(available.min, finite(value) ? value : current[edge]));
  return edge === "min" ? { min: Math.min(next, current.max), max: current.max } : { min: current.min, max: Math.max(next, current.min) };
}
