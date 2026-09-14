const compactFareViewportBaseline = 320;
const compactFareGrowthRate = 0.27;
const minimumLoadedFareWidth = 197;
const maximumLoadedFareWidth = 217;

export const nativeLoadedFareCardWidth = (windowWidth: number, _fareCount?: number) => {
  const responsiveWidth = minimumLoadedFareWidth + (windowWidth - compactFareViewportBaseline) * compactFareGrowthRate;
  return Math.min(maximumLoadedFareWidth, Math.max(minimumLoadedFareWidth, Math.round(responsiveWidth)));
};
