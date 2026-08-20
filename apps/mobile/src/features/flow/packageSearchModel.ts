export type PackageMode = "hotel-flight" | "flight-car" | "hotel-car" | "hotel-flight-car";

export const packageModes = [
  { value: "hotel-flight", label: "Flight + Hotel" },
  { value: "flight-car", label: "Flight + Car" },
  { value: "hotel-car", label: "Hotel + Car" },
  { value: "hotel-flight-car", label: "Flight + Hotel + Car" },
] as const satisfies readonly { value: PackageMode; label: string }[];

export const includedProducts = (mode: PackageMode) => ({
  flight: mode !== "hotel-car",
  hotel: mode !== "flight-car",
  car: mode !== "hotel-flight",
});

export type PackageSearch = {
  mode: PackageMode;
  origin: string; originCode: string; destination: string; destinationCode: string;
  startDate: string; endDate: string;
  adults: number; children: number; infants: number; rooms: number; petFriendly: boolean;
  cabin: "economy" | "business" | "first";
  carPickupLocation: string; carPickupDate: string; carReturnDate: string;
  carPickupTime: string; carReturnTime: string; carDriverAge: number;
  stayDestinationLinked: boolean; stayDatesLinked: boolean; carPickupLinked: boolean; carDatesLinked: boolean;
};

export const createPackageSearch = (): PackageSearch => ({
  mode: "hotel-flight", origin: "", originCode: "", destination: "", destinationCode: "",
  startDate: "", endDate: "", adults: 2, children: 0, infants: 0, rooms: 1,
  petFriendly: false, cabin: "economy", carPickupLocation: "", carPickupDate: "", carReturnDate: "",
  carPickupTime: "10:00", carReturnTime: "10:00", carDriverAge: 30,
  stayDestinationLinked: true, stayDatesLinked: true, carPickupLinked: true, carDatesLinked: true,
});

export function applyPackageDestination(search: PackageSearch, destination: string, code = ""): PackageSearch {
  return { ...search, destination, destinationCode: code,
    ...(search.carPickupLinked ? { carPickupLocation: destination } : {}) };
}

export function applyPackageDates(search: PackageSearch, startDate: string, endDate: string): PackageSearch {
  return { ...search, startDate, endDate,
    ...(search.carDatesLinked ? { carPickupDate: startDate, carReturnDate: endDate } : {}) };
}

export function transitionPackageMode(search: PackageSearch, mode: PackageMode): PackageSearch {
  const next = { ...search, mode };
  return {
    ...next,
    ...(next.carPickupLinked ? { carPickupLocation: next.destination } : {}),
    ...(next.carDatesLinked ? { carPickupDate: next.startDate, carReturnDate: next.endDate } : {}),
  };
}

export function updatePackageParty(search: PackageSearch, change: Partial<Pick<PackageSearch, "adults" | "children" | "infants" | "rooms" | "petFriendly">>): PackageSearch {
  const includesFlight = includedProducts(search.mode).flight;
  const maximum = includesFlight ? 9 : 12;
  let adults = Math.max(1, Math.min(maximum, change.adults ?? search.adults));
  let children = Math.max(0, change.children ?? search.children);
  let infants = Math.max(0, change.infants ?? search.infants);
  const overflow = Math.max(0, adults + children + infants - maximum);
  if (overflow) children = Math.max(0, children - overflow);
  infants = Math.min(infants, adults, Math.max(0, maximum - adults - children));
  return { ...search, ...change, adults, children, infants, rooms: Math.max(1, Math.min(6, change.rooms ?? search.rooms)) };
}
