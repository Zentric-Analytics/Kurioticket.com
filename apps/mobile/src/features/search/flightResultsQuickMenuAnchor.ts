export type FlightResultsQuickMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

let currentAnchor: FlightResultsQuickMenuAnchor | undefined;

export function setFlightResultsQuickMenuAnchor(anchor: FlightResultsQuickMenuAnchor) {
  currentAnchor = anchor;
}

export function getFlightResultsQuickMenuAnchor() {
  return currentAnchor;
}

export function clearFlightResultsQuickMenuAnchor() {
  currentAnchor = undefined;
}
