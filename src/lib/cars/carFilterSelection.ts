import type { SelectedCarFilters } from "./carResults";

export const getSelectedCarFiltersSignature = (
  filters: SelectedCarFilters,
) => JSON.stringify(
  Object.entries(filters)
    .filter(([, options]) => options.length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupId, options]) => [groupId, [...options].sort()]),
);
