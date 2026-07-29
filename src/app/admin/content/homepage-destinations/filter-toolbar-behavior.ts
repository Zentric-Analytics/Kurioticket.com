import type { ChangeEvent } from "react";

import type { HomepageDestinationAssignmentTypeFilter } from "./page-data";

export function submitHomepageDestinationFilters(event: ChangeEvent<HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

export function hasActiveHomepageDestinationFilters(
  q: string,
  market: string,
  assignmentType: HomepageDestinationAssignmentTypeFilter,
) {
  return Boolean(q || market !== "ALL" || assignmentType !== "ALL");
}
