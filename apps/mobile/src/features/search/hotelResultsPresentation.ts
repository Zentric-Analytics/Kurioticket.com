import type { HotelFilterGroup, HotelFilterOptions, HotelFilters } from "./hotelFilters";

export type HotelFilterChip = { key: string; label: string; remove: (filters: HotelFilters) => HotelFilters };

const chipGroups: { group: HotelFilterGroup; prefix: string }[] = [
  { group: "propertyTypes", prefix: "Property type" }, { group: "areas", prefix: "Area" },
  { group: "facilities", prefix: "Facility" }, { group: "travellerFeatures", prefix: "Good for your trip" },
  { group: "accessibility", prefix: "Accessibility" }, { group: "roomTypes", prefix: "Room" },
  { group: "bedTypes", prefix: "Bed" },
];

export function buildHotelFilterChips(filters: HotelFilters, options: HotelFilterOptions): HotelFilterChip[] {
  const chips: HotelFilterChip[] = [];
  if (filters.propertyNameQuery.trim()) chips.push({ key: "name", label: `Property: ${filters.propertyNameQuery.trim()}`, remove: value => ({ ...value, propertyNameQuery: "" }) });
  if ((filters.minimumPrice ?? options.price?.minimum ?? 0) > (options.price?.minimum ?? 0) || (filters.maximumPrice ?? options.price?.maximum ?? Infinity) < (options.price?.maximum ?? Infinity)) chips.push({ key: "price", label: "Price", remove: value => ({ ...value, minimumPrice: null, maximumPrice: null }) });
  filters.starRatings.forEach(star => chips.push({ key: `star-${star}`, label: `${star} stars`, remove: value => ({ ...value, starRatings: value.starRatings.filter(item => item !== star) }) }));
  chipGroups.forEach(({ group, prefix }) => filters[group].forEach(selected => {
    const label = options[group].find(option => option.value === selected)?.label ?? selected;
    chips.push({ key: `${group}-${selected}`, label: `${prefix}: ${label}`, remove: value => ({ ...value, [group]: value[group].filter(item => item !== selected) }) });
  }));
  return chips;
}

export const hasGoogleMapsDiscovery = (results: readonly { provider?: string }[]) => results.some(result => result.provider === "Google Maps");
