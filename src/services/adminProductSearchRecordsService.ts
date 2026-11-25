import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { createAdminProductSearchRecordsReader } from "./adminProductSearchRecordsCore";

/** Read-only product records. The endpoint must authorize on every call. */
export const adminProductSearchRecords = createAdminProductSearchRecordsReader({
  authorize: async () => !(await requireAdminApiSession()).response,
  database: getOptionalPrisma,
  environment: getPublicEnvironment,
  now: () => new Date(),
  timeZone: getAdminViewerTimeZone,
});
