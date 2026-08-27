import type { FlightSearchLeg } from "@/lib/types";

export function swapMultiCityLegState(
  legs: FlightSearchLeg[],
  verifiedAirports: Record<string, string>,
  legIndex: number,
) {
  const nextLegs = legs.map((leg, index) =>
    index === legIndex
      ? { ...leg, origin: leg.destination, destination: leg.origin }
      : leg,
  );
  const nextVerifiedAirports = { ...verifiedAirports };
  nextVerifiedAirports[`${legIndex}:origin`] =
    verifiedAirports[`${legIndex}:destination`] ?? "";
  nextVerifiedAirports[`${legIndex}:destination`] =
    verifiedAirports[`${legIndex}:origin`] ?? "";
  return { legs: nextLegs, verifiedAirports: nextVerifiedAirports };
}
