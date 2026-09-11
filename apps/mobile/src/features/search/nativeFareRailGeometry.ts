const loadedFareGap = 10;
export const nativeFareRailHorizontalInset = 36;
const compactFareViewportBaseline = 320;
const compactFareGrowthRate = 0.45;
const minimumLoadedFareWidth = 230;
const maximumLoadedFareWidth = 260;

export const nativeLoadedFareCardWidth = (windowWidth: number, _fareCount?: number) => {
  const responsiveWidth = minimumLoadedFareWidth + (windowWidth - compactFareViewportBaseline) * compactFareGrowthRate;
  return Math.min(maximumLoadedFareWidth, Math.max(minimumLoadedFareWidth, Math.round(responsiveWidth)));
};

export const nativeInitialFareRailOffset = (selectedIndex: number, cardWidth: number, viewportWidth: number, fareCount: number) => {
  if (selectedIndex <= 0 || fareCount <= 1) return 0;
  const contentWidth = fareCount * cardWidth + (fareCount - 1) * loadedFareGap;
  return Math.max(0, Math.min(selectedIndex * (cardWidth + loadedFareGap) - 18, contentWidth - viewportWidth));
};
