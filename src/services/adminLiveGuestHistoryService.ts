import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { presenceSigningSecret } from "@/lib/onlinePresenceCredential";
import type { OnlineIdentityRow } from "@/lib/adminOnlineUsersSnapshot";
import type { PublicEnvironment } from "@/lib/stagingSafety";
import {
  liveGuestHistoryCandidatesSql, liveGuestHistoryTargetSql, resolveVerifiedLiveGuestHistory,
  type LiveGuestHistoryCandidate,
} from "@/lib/adminLiveGuestHistory";

/** The calling Admin page must authenticate first. Never return a credential
 * or attach this association to the general online-roster API. */
export async function resolveAdminLiveGuestHistory(
  row: OnlineIdentityRow, environment: PublicEnvironment, now = new Date(),
): Promise<{ kind: "visitor" | "operational"; id: string } | null> {
  if (environment !== "staging" || row.kind !== "guest" || !row.liveReference) return null;
  const db = getOptionalPrisma();
  const secret = presenceSigningSecret();
  if (!db || !secret) return null;
  try {
    return await resolveVerifiedLiveGuestHistory(row, environment, now, secret, {
      clock: () => new Date(),
      readCandidates: at => db.$queryRaw<LiveGuestHistoryCandidate[]>(liveGuestHistoryCandidatesSql(environment, at)),
      targetEligible: async (candidate, identity, at) => {
        const [target] = await db.$queryRaw<Array<{ eligible: boolean }>>(liveGuestHistoryTargetSql(candidate, identity, environment, at));
        return target?.eligible === true;
      },
    });
  } catch {
    // Missing migration, expired proof, or read failure keeps the live fallback.
    return null;
  }
}
