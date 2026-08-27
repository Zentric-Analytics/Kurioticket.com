export function searchPickerSheetTravelDistance(
  windowHeight: number,
  measuredSheetHeight: number | undefined,
  screenHeight: number,
  bottomClearance = 0,
) {
  return measuredSheetHeight !== undefined && Number.isFinite(measuredSheetHeight) && measuredSheetHeight > 0
    ? measuredSheetHeight + Math.max(0, bottomClearance)
    : Math.max(windowHeight, screenHeight);
}
