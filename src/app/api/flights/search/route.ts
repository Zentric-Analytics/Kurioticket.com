import { withProductionSandboxRequest } from "@/lib/productionSandboxPolicy";
import { handleFlightSearch } from "./handler";

export function POST(request: Request) {
  return withProductionSandboxRequest(request, () => handleFlightSearch(request, "customer"));
}
