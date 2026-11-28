import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";
import { createAdminAuditReadService } from "./adminAuditReadCore";

export async function canReadAdminAudit() {
  return !(await requireAdminApiSession()).response;
}

export const adminAuditReads = createAdminAuditReadService({
  authorize: canReadAdminAudit,
  database: getOptionalPrisma,
});
