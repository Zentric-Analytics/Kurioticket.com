import { getPrisma } from "@/lib/prisma";
const SIGNAL_LIMIT = 50;
export async function getHomepagePersonalizationSignals(userId: string) {
  try {
    const db = getPrisma();
    const preferences = await db.userCustomizationPreferences.findUnique({ where: { userId }, select: { personalizeRecommendations: true } });
    if (preferences?.personalizeRecommendations === false) return [];
    const items = await db.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: SIGNAL_LIMIT, select: { destination: true } });
    return [...new Set(items.map(item => item.destination?.trim().toUpperCase()).filter((value): value is string => Boolean(value)))];
  } catch (error) { console.error("[homepage-recommendations:signals]", error); return []; }
}
