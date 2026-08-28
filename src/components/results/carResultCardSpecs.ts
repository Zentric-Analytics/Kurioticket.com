import {
  BriefcaseBusiness,
  CarFront,
  DoorOpen,
  Fuel,
  Gauge,
  Snowflake,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NormalizedCarResult } from "@/lib/cars/types";

export const formatCarPickupType = (value: string) => {
  const normalized = value.replaceAll("-", " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const title = (value: string) =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Stable comparison anchors followed by the two most distinctive normalized facts. */
export function getMobileCarPrimarySpecs(
  car: NormalizedCarResult,
): Array<[LucideIcon, string]> {
  const specs: Array<[LucideIcon, string]> = [
    [Users, `${car.passengers} passengers`],
    [BriefcaseBusiness, `${car.bags} bags`],
  ];
  const mileage: [LucideIcon, string] = [
    Gauge,
    car.mileagePolicy === "unlimited"
      ? "Unlimited mileage"
      : Number.isFinite(car.limitedMileageKm)
        ? `${car.limitedMileageKm} km included`
        : "Limited mileage",
  ];
  const transmission: [LucideIcon, string] = [
    CarFront,
    title(car.transmission),
  ];
  const doors: [LucideIcon, string] = [DoorOpen, `${car.doors} doors`];
  const fuel: [LucideIcon, string] = [Fuel, title(car.fuelPolicy)];
  const airConditioning: [LucideIcon, string] = [Snowflake, "Air conditioning"];
  const candidates: Array<[LucideIcon, string]> = [];
  if (car.transmission === "manual") candidates.push(transmission);
  if (car.mileagePolicy === "limited") candidates.push(mileage);
  if (car.passengers !== 5 || ![4, 5].includes(car.doors))
    candidates.push(doors);
  if (car.fuelPolicy !== "full-to-full") candidates.push(fuel);
  candidates.push(transmission, mileage);
  if (car.airConditioning) candidates.push(airConditioning);
  candidates.push(doors);
  for (const candidate of candidates)
    if (!specs.some(([, label]) => label === candidate[1]))
      specs.push(candidate);
  return specs.slice(0, 4);
}
