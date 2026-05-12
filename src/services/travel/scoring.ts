import type { Layover } from "@/lib/types";

type FlightScoreInput = {
  price: number;
  durationMinutes: number;
  stops: number;
  baggageInfo?: string;
  layovers?: Layover[];
};

export function scoreFlight(input: FlightScoreInput) {
  const priceScore = clamp(100 - input.price / 18, 18, 96);
  const durationScore = clamp(100 - input.durationMinutes / 10, 22, 98);
  const stopPenalty = input.stops * 11;
  const baggageBonus = input.baggageInfo?.toLowerCase().includes("included") ? 5 : 0;
  const layoverPenalty =
    input.layovers?.reduce((total, layover) => {
      if (layover.quality === "overnight") return total + 18;
      if (layover.quality === "long") return total + 9;
      if (layover.quality === "short") return total + 6;
      return total;
    }, 0) ?? 0;

  const riskScore = clamp(18 + stopPenalty + layoverPenalty, 5, 92);
  const comfortScore = clamp(durationScore + baggageBonus - stopPenalty - layoverPenalty / 2, 12, 98);
  const valueScore = clamp(priceScore * 0.58 + comfortScore * 0.28 + (100 - riskScore) * 0.14, 8, 99);
  const travelConfidenceScore = clamp(valueScore * 0.46 + comfortScore * 0.34 + (100 - riskScore) * 0.2, 8, 99);
  const travelEffortScore = clamp(100 - comfortScore + input.stops * 8 + layoverPenalty / 2, 8, 96);

  return {
    valueScore: Math.round(valueScore),
    riskScore: Math.round(riskScore),
    comfortScore: Math.round(comfortScore),
    travelConfidenceScore: Math.round(travelConfidenceScore),
    travelEffortScore: Math.round(travelEffortScore),
  };
}

export function scoreHotel(input: {
  totalPrice: number;
  rating: number;
  amenities: string[];
  arrivalFriendly?: boolean;
}) {
  const priceScore = clamp(100 - input.totalPrice / 24, 20, 96);
  const qualityScore = clamp(input.rating * 18, 20, 98);
  const amenityBonus = Math.min(input.amenities.length * 2, 10);
  const arrivalSuitabilityScore = clamp((input.arrivalFriendly ? 84 : 70) + amenityBonus, 30, 98);
  const valueScore = clamp(priceScore * 0.52 + qualityScore * 0.32 + amenityBonus, 12, 99);
  const travelConfidenceScore = clamp(valueScore * 0.45 + qualityScore * 0.3 + arrivalSuitabilityScore * 0.25, 12, 99);

  return {
    valueScore: Math.round(valueScore),
    travelConfidenceScore: Math.round(travelConfidenceScore),
    arrivalSuitabilityScore: Math.round(arrivalSuitabilityScore),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
