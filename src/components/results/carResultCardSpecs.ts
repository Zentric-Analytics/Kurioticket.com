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

const providerCarSpec = (label: string | undefined): MobileCarSpec | null => {
  const trimmed = label?.trim() ?? "";
  if (!trimmed || authoredMissingProviderSpecs.has(trimmed)) return null;
  return [getCarSpecificationIcon(trimmed), trimmed];
};

/**
 * KAYAK carSpecs are normalized in provider order:
 * passengers, bags, doors, transmission.
 * Reorder those fixed provider-owned slots into the same mobile columns used
 * by native/Kurioticket: passengers -> transmission | doors -> bags.
 * Missing values remain absent rather than shifting another fact into the
 * wrong visual position.
 */
export function getMobileProviderCarSpecSlots(
  labels: string[],
): MobileCarSpecSlots {
  return [
    providerCarSpec(labels[0]),
    providerCarSpec(labels[3]),
    providerCarSpec(labels[2]),
    providerCarSpec(labels[1]),
  ];
}

export function getMobileCarSpecColumns(
  slots: readonly (MobileCarSpec | null)[],
): MobileCarSpec[][] {
  const present = (spec: MobileCarSpec | null): spec is MobileCarSpec =>
    spec !== null;

  return [
    slots.slice(0, 2).filter(present),
    slots.slice(2, 4).filter(present),
  ].filter((column) => column.length > 0);
}

/** Mobile card grid: passengers/transmission left, doors/bags right. */
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
