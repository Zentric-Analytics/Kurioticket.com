import type { HotelResultsSearchInput } from "@/components/results/HotelResultsClient";
import { buildHotelApiPayload, type DealsSearch } from "./dealsSearchParams";

export function buildDealsHotelResultsSearchInput(search: DealsSearch): HotelResultsSearchInput {
  return buildHotelApiPayload(search);
}
