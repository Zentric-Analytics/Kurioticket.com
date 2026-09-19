const CAR_DETAIL_CONTROL_TOP_OFFSET = 12;
const CAR_DETAIL_CONTROL_HEIGHT = 44;
const CAR_DETAIL_CONTROL_BOTTOM_SPACING = 14;

export function carDetailHeaderProtectionGeometry(topInset: number, heroMediaHeight: number) {
  const protectedHeight = topInset + CAR_DETAIL_CONTROL_TOP_OFFSET + CAR_DETAIL_CONTROL_HEIGHT + CAR_DETAIL_CONTROL_BOTTOM_SPACING;
  return {
    protectedHeight,
    threshold: Math.max(0, heroMediaHeight - protectedHeight),
  };
}
