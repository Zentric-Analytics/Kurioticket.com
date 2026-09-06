export function shouldPinFlightQuickControls(scrollOffset: number, measuredAnchor: number): boolean {
  return scrollOffset >= measuredAnchor;
}

export function flightQuickControlsPinStateChanged(current: boolean, next: boolean): boolean {
  return current !== next;
}
