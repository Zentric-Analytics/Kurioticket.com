const FLIGHT_PRICE_ALERT_SCREEN_ANCHOR_RATIO = 0.62;
const FLIGHT_PRICE_ALERT_MINIMUM_CARD_SPACE = 240;

/**
 * Returns the bottom edge of the Flight price-alert card in full-screen space.
 * Deliberately accepts no keyboard geometry: the modal and its close control must
 * retain this coordinate while the software keyboard opens or closes.
 */
export function flightPriceAlertAnchorBottom(screenHeight: number, safeAreaTop: number) {
  return Math.max(
    safeAreaTop + FLIGHT_PRICE_ALERT_MINIMUM_CARD_SPACE,
    Math.round(screenHeight * FLIGHT_PRICE_ALERT_SCREEN_ANCHOR_RATIO),
  );
}
