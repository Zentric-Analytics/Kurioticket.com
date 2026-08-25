/** Experiment B: isolate remote airline image loading on native iOS Flight Results only. */
export function flightResultsAllowRemoteAirlineImages(platform: string) {
  return platform !== "ios";
}

export function airlineInitials(airlineName: string, fallbackCharacters = 2) {
  const words = airlineName.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, fallbackCharacters).map((word) => word[0]).join("").toUpperCase();
  return words[0]?.slice(0, fallbackCharacters).toUpperCase() ?? "";
}
