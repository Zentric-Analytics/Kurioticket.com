const compactFareViewportBaseline = 320;
const compactFareGrowthRate = 0.45;
const minimumLoadedFareWidth = 230;
const maximumLoadedFareWidth = 260;

export const nativeLoadedFareCardWidth = (windowWidth: number, _fareCount?: number) => {
  const responsiveWidth = minimumLoadedFareWidth + (windowWidth - compactFareViewportBaseline) * compactFareGrowthRate;
  return Math.min(maximumLoadedFareWidth, Math.max(minimumLoadedFareWidth, Math.round(responsiveWidth)));
};
