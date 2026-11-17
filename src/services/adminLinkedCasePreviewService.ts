import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";
import { createAdminLinkedCasePreviewReader } from "./adminLinkedCasePreviewCore";

/** Each preview read re-checks canonical ADMIN access. There are no writes. */
export const readAdminLinkedCasePreview = createAdminLinkedCasePreviewReader({
  authorize: async () => !(await requireAdminApiSession()).response,
  database: getOptionalPrisma,
});
