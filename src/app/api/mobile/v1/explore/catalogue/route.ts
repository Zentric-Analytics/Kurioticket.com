import { mobileApiError, mobileApiSuccess } from "@/lib/mobile-api/response";
import {
  ExploreCatalogueUnavailableError,
  loadPublishedExploreCatalogue,
  type MobileExploreCatalogue,
} from "@/services/exploreCatalogueService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExploreCatalogueLoader = () => Promise<MobileExploreCatalogue>;

export function createExploreCatalogueGet(
  loadCatalogue: ExploreCatalogueLoader = loadPublishedExploreCatalogue,
) {
  return async function GET() {
    try {
      return mobileApiSuccess(await loadCatalogue());
    } catch (error) {
      if (error instanceof ExploreCatalogueUnavailableError) {
        return mobileApiError(
          {
            code: "EXPLORE_CATALOGUE_UNAVAILABLE",
            message: "Explore is temporarily unavailable.",
          },
          { status: 503 },
        );
      }

      console.error("[mobile explore catalogue]", error);
      return mobileApiError(
        {
          code: "EXPLORE_CATALOGUE_ERROR",
          message: "Unable to load Explore right now.",
        },
        { status: 503 },
      );
    }
  };
}

export const GET = createExploreCatalogueGet();
