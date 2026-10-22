import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { createVisitorIdentityService } from "@/services/visitorIdentityCore";

export const {
  registerAnalyticsVisitor,
  getAnalyticsVisitorStatus,
  resolveConsentedVisitorId,
  linkVisitorToUser,
  mergeAnalyticsVisitor,
  withdrawAnalyticsConsent,
} = createVisitorIdentityService(getOptionalPrisma);
