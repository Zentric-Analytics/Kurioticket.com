import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { createAdminOperationalReadService } from "./adminOperationalReadCore";

export const adminOperationalReads = createAdminOperationalReadService({
  authorize: async () => !(await requireAdminApiSession()).response,
  database: getOptionalPrisma,
  environment: getPublicEnvironment,
});
