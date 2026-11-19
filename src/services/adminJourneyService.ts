import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { createAdminJourneyService } from "./adminJourneyCore";

/** Same configured ADMIN / canonical account-session boundary as existing admin APIs. */
export const adminJourneys = createAdminJourneyService({
  authorize: async () => !(await requireAdminApiSession()).response,
  database: getOptionalPrisma,
  environment: getPublicEnvironment,
});
