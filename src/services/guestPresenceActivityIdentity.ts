import "server-only";
import { createGuestPresenceActivityIdentityResolver } from "@/lib/guestPresenceActivityIdentity";
import { getOptionalPrisma } from "@/lib/prisma";

export { recheckGuestPresenceActivityIdentity } from "@/lib/guestPresenceActivityIdentity";

export const resolveGuestPresenceActivityIdentity = createGuestPresenceActivityIdentityResolver({
  getDatabase: getOptionalPrisma,
});
