const loadedFareGap = 10;
export const nativeFareRailHorizontalInset = 36;
const nextFareReveal = 74;
const minimumLoadedFareWidth = 230;
const maximumLoadedFareWidth = 260;

export const nativeLoadedFareCardWidth = (windowWidth: number, _fareCount?: number) => {
  const availableWidth = windowWidth - nativeFareRailHorizontalInset;
  return Math.min(maximumLoadedFareWidth, Math.max(minimumLoadedFareWidth, availableWidth - nextFareReveal));
};

export const nativeInitialFareRailOffset = (selectedIndex: number, cardWidth: number, viewportWidth: number, fareCount: number) => {
  if (selectedIndex <= 0 || fareCount <= 1) return 0;
  const contentWidth = fareCount * cardWidth + (fareCount - 1) * loadedFareGap;
  return Math.max(0, Math.min(selectedIndex * (cardWidth + loadedFareGap) - 18, contentWidth - viewportWidth));
};
