import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";
import { createAdminSettingsHistoryReader } from "./adminSettingsHistoryCore";

export const adminSettingsHistory = createAdminSettingsHistoryReader({
  authorize: async () => !(await requireAdminApiSession()).response,
  database: getOptionalPrisma,
});
