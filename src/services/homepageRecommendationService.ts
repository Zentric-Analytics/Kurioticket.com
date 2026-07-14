import { getPrisma } from "@/lib/prisma";
import { getSavedTripHomepageDestinationCodes } from "@/lib/recommendations/homepagePersonalization";

const HOMEPAGE_SAVED_TRIP_SIGNAL_LIMIT = 50;

type HomepageRecommendationPrisma = {
  userCustomizationPreferences: {
    findUnique(args: unknown): Promise<{ personalizeRecommendations: boolean } | null>;
  };
  savedTrip: {
    findMany(args: unknown): Promise<
      Array<{
        destination: string | null;
        savedSearch: { destination: string | null } | null;
      }>
    >;
  };
};

export async function getHomepagePersonalizationSignals(userId: string) {
  try {
    const prisma = getPrisma() as unknown as HomepageRecommendationPrisma;
    const preferences = await prisma.userCustomizationPreferences.findUnique({
      where: { userId },
      select: { personalizeRecommendations: true },
    });

    if (preferences?.personalizeRecommendations === false) return [];

    const savedTrips = await prisma.savedTrip.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: HOMEPAGE_SAVED_TRIP_SIGNAL_LIMIT,
      select: {
        destination: true,
        savedSearch: { select: { destination: true } },
      },
    });

    return getSavedTripHomepageDestinationCodes(
      savedTrips.map((trip) => ({
        destination: trip.destination,
        linkedSearchDestination: trip.savedSearch?.destination ?? null,
      })),
    );
  } catch (error) {
    console.error("[homepage-recommendations:signals]", error);
    return [];
  }
}
