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
  return snapRangeValue(available.min + (Math.min(width, Math.max(0, position)) / width) * span, available, step);
}

export function moveRangeEdge(selected: NumericRange, edge: "min" | "max", value: number, available: NumericRange): NumericRange {
  const current = clampNumericRange(selected, available);
  const next = Math.min(available.max, Math.max(available.min, finite(value) ? value : current[edge]));
  return edge === "min" ? { min: Math.min(next, current.max), max: current.max } : { min: current.min, max: Math.max(next, current.min) };
}
