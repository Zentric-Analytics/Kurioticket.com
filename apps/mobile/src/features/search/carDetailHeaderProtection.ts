const CAR_DETAIL_CONTROL_TOP_OFFSET = 12;
const CAR_DETAIL_CONTROL_HEIGHT = 44;
const CAR_DETAIL_CONTROL_BOTTOM_SPACING = 14;
const CAR_DETAIL_PROTECTION_LEAD = 16;
const CAR_DETAIL_PROTECTION_HYSTERESIS = 12;

export function carDetailHeaderProtectionGeometry(topInset: number, heroMediaHeight: number) {
  const protectedHeight = topInset + CAR_DETAIL_CONTROL_TOP_OFFSET + CAR_DETAIL_CONTROL_HEIGHT + CAR_DETAIL_CONTROL_BOTTOM_SPACING;
  const activationThreshold = Math.max(0, heroMediaHeight - protectedHeight - CAR_DETAIL_PROTECTION_LEAD);
  return {
    protectedHeight,
    activationThreshold,
    deactivationThreshold: Math.max(0, activationThreshold - CAR_DETAIL_PROTECTION_HYSTERESIS),
  };
}

export function shouldProtectCarDetailHeader(
  offset: number,
  currentlyProtected: boolean,
  activationThreshold: number,
  deactivationThreshold: number,
) {
  return currentlyProtected
    ? offset >= deactivationThreshold
    : offset >= activationThreshold;
}
