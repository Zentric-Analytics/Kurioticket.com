import { handleFlightSearch } from "../search/handler";

export function POST(request: Request) {
  return handleFlightSearch(request, "nearby-fare");
}
