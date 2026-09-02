import {
  BriefcaseBusiness,
  CarFront,
  DoorOpen,
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

/** Mobile card grid: transmission and luggage share the right-hand column. */
export function getMobileCarPrimarySpecs(
  car: NormalizedCarResult,
): Array<[LucideIcon, string]> {
  return [
    [Users, `${car.passengers} passengers`],
    [CarFront, title(car.transmission)],
    [DoorOpen, `${car.doors} doors`],
    [BriefcaseBusiness, `${car.bags} bags`],
  ];
}
