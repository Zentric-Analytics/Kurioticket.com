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

export type DesktopCompactFilterPlacementState = "hidden" | "fixed" | "docked";

export type DesktopCompactFilterPlacementInput = {
  enabled: boolean;
  scrollY: number;
  desiredTop: number;
  panelHeight: number;
  bodyBottomDocument: number;
  currentState?: DesktopCompactFilterPlacementState;
  bottomGap?: number;
  dockOverlap?: number;
  undockClearance?: number;
};

export type DesktopCompactFilterPlacement =
  | { state: "hidden" }
  | { state: "fixed" }
  | { state: "docked" };

const defaultBottomGap = 12;
const defaultDockOverlap = 3;
const defaultUndockClearance = 8;

export function calculateCompactFilterPlacement({
  enabled,
  scrollY,
  desiredTop,
  panelHeight,
  bodyBottomDocument,
  currentState,
  bottomGap = defaultBottomGap,
  dockOverlap = defaultDockOverlap,
  undockClearance = defaultUndockClearance,
}: DesktopCompactFilterPlacementInput): DesktopCompactFilterPlacement {
  if (
    !enabled ||
    !Number.isFinite(scrollY) ||
    !Number.isFinite(desiredTop) ||
    !Number.isFinite(panelHeight) ||
    !Number.isFinite(bodyBottomDocument) ||
    !Number.isFinite(bottomGap) ||
    !Number.isFinite(dockOverlap) ||
    !Number.isFinite(undockClearance) ||
    scrollY < 0 ||
    desiredTop < 0 ||
    panelHeight <= 0 ||
    bodyBottomDocument <= 0 ||
    bottomGap < 0 ||
    dockOverlap < 0 ||
    undockClearance < 0
  ) {
    return { state: "hidden" };
  }

  if (bodyBottomDocument <= panelHeight + bottomGap) {
    return { state: "hidden" };
  }

  const bodyStopDocument = bodyBottomDocument - bottomGap;
  const fixedPanelBottomDocument = scrollY + desiredTop + panelHeight;
  const overlap = fixedPanelBottomDocument - bodyStopDocument;

  if (currentState === "fixed") {
    return overlap >= dockOverlap ? { state: "docked" } : { state: "fixed" };
  }

  if (currentState === "docked") {
    return overlap <= -undockClearance ? { state: "fixed" } : { state: "docked" };
  }

  return overlap >= 0 ? { state: "docked" } : { state: "fixed" };
}
