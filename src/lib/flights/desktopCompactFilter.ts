export type DesktopCompactFilterVisibilityInput = {
  viewportWidth: number;
  sentinelTop: number;
  topOffset: number;
};

export function shouldShowDesktopCompactFilter({
  viewportWidth,
  sentinelTop,
  topOffset,
}: DesktopCompactFilterVisibilityInput): boolean {
  return viewportWidth >= 1024 && sentinelTop <= topOffset;
}

export type FlightQualityFilterVisibilityInput = {
  loading: boolean;
  optionCount: number;
};

export function shouldRenderFlightQualityFilter({
  loading,
  optionCount,
}: FlightQualityFilterVisibilityInput): boolean {
  return !loading && optionCount > 0;
}

export type DesktopCompactFilterPlacementInput = {
  enabled: boolean;
  desiredTop: number;
  panelHeight: number;
  bodyBottom: number;
};

export type DesktopCompactFilterPlacement =
  | { state: "hidden" }
  | { state: "fixed"; top: number };

export function calculateCompactFilterPlacement({
  enabled,
  desiredTop,
  panelHeight,
  bodyBottom,
}: DesktopCompactFilterPlacementInput): DesktopCompactFilterPlacement {
  if (
    !enabled ||
    !Number.isFinite(desiredTop) ||
    !Number.isFinite(panelHeight) ||
    !Number.isFinite(bodyBottom) ||
    desiredTop < 0 ||
    panelHeight <= 0 ||
    bodyBottom <= 0
  ) {
    return { state: "hidden" };
  }

  const maximumViewportTop = bodyBottom - panelHeight;

  if (maximumViewportTop <= 0) {
    return { state: "hidden" };
  }

  return {
    state: "fixed",
    top: Math.min(desiredTop, maximumViewportTop),
  };
}
