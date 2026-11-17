import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { createAdminSearchScopedActivityReader } from "./adminSearchScopedActivityCore";

/** Authorization is independent of the Search Detail UI or navigation links. */
export const readAdminSearchScopedActivity = createAdminSearchScopedActivityReader({
  authorize: async () => !(await requireAdminApiSession()).response,
  database: getOptionalPrisma,
  environment: getPublicEnvironment,
});
