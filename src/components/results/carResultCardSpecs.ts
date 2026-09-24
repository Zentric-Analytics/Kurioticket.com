import {
  BriefcaseBusiness,
  CarFront,
  DoorOpen,
  Fuel,
  Gauge,
  MapPin,
  Snowflake,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NormalizedCarResult } from "@/lib/cars/types";
import {
  AutomaticTransmissionIcon,
  ManualTransmissionIcon,
} from "@/components/results/CarTransmissionIcon";

export const formatCarPickupType = (value: string) => {
  const normalized = value.replaceAll("-", " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const title = (value: string) =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * Resolve provider-owned car specification text to the same semantic glyphs
 * used by Kurioticket's normalized Cars UI. Unknown provider text keeps the
 * neutral car fallback instead of inventing a meaning.
 */
export function getCarSpecificationIcon(label: string): LucideIcon {
  const normalized = label.trim().toLowerCase();

  if (/\bmanual\b/.test(normalized)) return ManualTransmissionIcon;
  if (/\bautomatic\b/.test(normalized)) return AutomaticTransmissionIcon;
  if (/\b(passengers?|seats?)\b/.test(normalized)) return Users;
  if (/\b(bags?|baggage|luggage)\b/.test(normalized)) return BriefcaseBusiness;
  if (/\bdoors?\b/.test(normalized)) return DoorOpen;
  if (/\bair\s*conditioning\b|\ba\/c\b/.test(normalized)) return Snowflake;
  if (/\bmileage\b|\bkilomet(?:er|re)s?\b|\bkm\b/.test(normalized)) return Gauge;
  if (/\bfuel\b/.test(normalized)) return Fuel;
  if (/\bpick[\s-]?up\b|\blocation\b/.test(normalized)) return MapPin;

  return CarFront;
}

/** Mobile card grid: transmission and luggage share the right-hand column. */
export function getMobileCarPrimarySpecs(
  car: NormalizedCarResult,
): Array<[LucideIcon, string]> {
  const transmissionIcon = /manual/i.test(car.transmission)
    ? ManualTransmissionIcon
    : /automatic/i.test(car.transmission)
      ? AutomaticTransmissionIcon
      : CarFront;

  return [
    [Users, `${car.passengers} passengers`],
    [transmissionIcon, title(car.transmission)],
    [DoorOpen, `${car.doors} doors`],
    [BriefcaseBusiness, `${car.bags} bags`],
  ];
}
