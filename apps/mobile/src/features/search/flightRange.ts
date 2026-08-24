import type { NumericRange } from "./flightFilters";

const finite = (value: number) => Number.isFinite(value);

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
  if (!finite(width) || width <= 0 || !finite(span) || span <= 0) return 0;
  return Math.min(width, Math.max(0, ((value - available.min) / span) * width));
}

export function rangeValueForPosition(position: number, available: NumericRange, width: number, step: number): number {
  const span = available.max - available.min;
  if (!finite(position) || !finite(width) || width <= 0 || !finite(span) || span <= 0) return available.min;
  // Physical endpoints must restore the exact extent even when the span is not divisible by the step.
  if (position <= 0) return available.min;
  if (position >= width) return available.max;
  return snapRangeValue(available.min + (position / width) * span, available, step);
}

/** At an overlap, drag direction determines which edge can move away from the shared value. */
export function rangeEdgeForDrag(selected: NumericRange, requested: "min" | "max", deltaX: number): "min" | "max" {
  if (selected.min !== selected.max || deltaX === 0 || !finite(deltaX)) return requested;
  return deltaX < 0 ? "min" : "max";
}

export function moveRangeEdge(selected: NumericRange, edge: "min" | "max", value: number, available: NumericRange): NumericRange {
  const current = clampNumericRange(selected, available);
  const next = Math.min(available.max, Math.max(available.min, finite(value) ? value : current[edge]));
  return edge === "min" ? { min: Math.min(next, current.max), max: current.max } : { min: current.min, max: Math.max(next, current.min) };
}
