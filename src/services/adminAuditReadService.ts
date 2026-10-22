import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";
import { createAdminAuditReadService } from "./adminAuditReadCore";

export const adminAuditReads = createAdminAuditReadService({
  authorize: async () => !(await requireAdminApiSession()).response,
  database: getOptionalPrisma,
});
