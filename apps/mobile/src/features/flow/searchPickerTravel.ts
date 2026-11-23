export function searchPickerSheetTravelDistance(
  windowHeight: number,
  measuredSheetHeight: number | undefined,
  screenHeight: number,
) {
  return measuredSheetHeight !== undefined && Number.isFinite(measuredSheetHeight) && measuredSheetHeight > 0
    ? measuredSheetHeight
    : Math.max(windowHeight, screenHeight);
}
