import { handleFlightSearch } from "./handler";

export function POST(request: Request) {
  return handleFlightSearch(request, "customer");
}
