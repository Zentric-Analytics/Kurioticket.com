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

export type MobileCarResultIdentity = {
  primaryName: string;
  secondaryModel: string | null;
};

const MERCEDES_BENZ_PREFIX = "Mercedes-Benz ";

export function getMobileCarResultIdentity(
  modelName: string,
): MobileCarResultIdentity {
  const normalizedModelName = modelName.trim().replace(/\s+/g, " ");

  if (normalizedModelName.startsWith(MERCEDES_BENZ_PREFIX)) {
    const secondaryModel = normalizedModelName
      .slice(MERCEDES_BENZ_PREFIX.length)
      .trim();
    if (secondaryModel) {
      return { primaryName: "Mercedes-Benz", secondaryModel };
    }
  }

  return { primaryName: normalizedModelName, secondaryModel: null };
}

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

export type MobileCarSpec = [LucideIcon, string];
export type MobileCarSpecSlots = [
  MobileCarSpec | null,
  MobileCarSpec | null,
  MobileCarSpec | null,
  MobileCarSpec | null,
];

const authoredMissingProviderSpecs = new Set([
  "Passengers not supplied",
  "Baggage capacity not supplied",
  "Doors not supplied",
  "Transmission not supplied",
  "Specifications not supplied",
]);

/**
 * Provider specs can arrive in provider order, but the mobile result card has
 * fixed semantic slots matching native/Kurioticket:
 * passengers -> transmission | doors -> bags.
 * Missing provider-owned values remain empty instead of shifting another fact
 * into the wrong visual position.
 */
export function getMobileProviderCarSpecSlots(
  labels: string[],
): MobileCarSpecSlots {
  const slots: MobileCarSpecSlots = [null, null, null, null];

  for (const rawLabel of labels) {
    const label = rawLabel.trim();
    if (!label || authoredMissingProviderSpecs.has(label)) continue;

    const normalized = label.toLowerCase();
    const spec: MobileCarSpec = [getCarSpecificationIcon(label), label];

    if (!slots[0] && /\b(passengers?|seats?)\b/.test(normalized)) {
      slots[0] = spec;
      continue;
    }
    if (
      !slots[1] &&
      /\b(automatic|manual|transmission)\b/.test(normalized)
    ) {
      slots[1] = spec;
      continue;
    }
    if (!slots[2] && /\bdoors?\b/.test(normalized)) {
      slots[2] = spec;
      continue;
    }
    if (!slots[3] && /\b(bags?|baggage|luggage)\b/.test(normalized)) {
      slots[3] = spec;
    }
  }

  return slots;
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
