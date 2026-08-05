import { buildCarApiPayload, buildCarResultsUrl, type DealsSearch } from "./dealsSearchParams";
import { buildDealsCarDetailsJourneyUrl } from "./dealsJourneyRoutes";

export const buildDealsCarRequestPayload = (search: DealsSearch) => buildCarApiPayload(search);
export const buildDealsCarRequestIdentity = (search: DealsSearch) => buildCarResultsUrl(search);
export const buildGuidedDealsCarActionHref = (search: DealsSearch, carId: unknown) =>
  buildDealsCarDetailsJourneyUrl(search, carId);
