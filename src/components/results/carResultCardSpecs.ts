import { BriefcaseBusiness, CarFront, Gauge, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NormalizedCarResult } from "@/lib/cars/types";

const title = (value: string) =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function getMobileCarPrimarySpecs(
  car: NormalizedCarResult,
): Array<[LucideIcon, string]> {
  const mileage =
    car.mileagePolicy === "unlimited"
      ? "Unlimited mileage"
      : typeof car.limitedMileageKm === "number" &&
          Number.isFinite(car.limitedMileageKm)
        ? `${car.limitedMileageKm} km included`
        : "Limited mileage";

  return [
    [Users, `${car.passengers} passengers`],
    [BriefcaseBusiness, `${car.bags} bags`],
    [CarFront, title(car.transmission)],
    [Gauge, mileage],
  ];
}
