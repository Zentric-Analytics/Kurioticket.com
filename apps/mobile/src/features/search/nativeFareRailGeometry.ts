const loadedFareGap = 10;
export const nativeFareRailHorizontalInset = 36;
const nextFareReveal = 54;
const minimumLoadedFareWidth = 236;
const maximumLoadedFareWidth = 330;
const maximumSingleFareWidth = 394;

export const nativeLoadedFareCardWidth = (windowWidth: number, fareCount: number) => {
  const availableWidth = windowWidth - nativeFareRailHorizontalInset;
  if (fareCount <= 1) return Math.min(maximumSingleFareWidth, Math.max(minimumLoadedFareWidth, availableWidth));
  return Math.min(maximumLoadedFareWidth, Math.max(minimumLoadedFareWidth, availableWidth - nextFareReveal));
};

export const nativeInitialFareRailOffset = (selectedIndex: number, cardWidth: number, viewportWidth: number, fareCount: number) => {
  if (selectedIndex <= 0 || fareCount <= 1) return 0;
  const contentWidth = fareCount * cardWidth + (fareCount - 1) * loadedFareGap;
  return Math.max(0, Math.min(selectedIndex * (cardWidth + loadedFareGap) - 18, contentWidth - viewportWidth));
};
