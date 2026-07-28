export type InventoryEmptyStateCopy = {
  filteredTitle: string;
  filteredMessage: string;
  sourceTitle: string;
  sourceMessage: string;
};

export type InventoryEmptyState = {
  title: string;
  message: string;
  showClearFilters: boolean;
};

export function getInventoryEmptyState(
  sourceCount: number,
  matchingCount: number,
  filtersActive: boolean,
  copy: InventoryEmptyStateCopy,
): InventoryEmptyState | null {
  if (matchingCount > 0) return null;

  return sourceCount === 0
    ? { title: copy.sourceTitle, message: copy.sourceMessage, showClearFilters: filtersActive }
    : { title: copy.filteredTitle, message: copy.filteredMessage, showClearFilters: true };
}
