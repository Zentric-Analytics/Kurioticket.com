import {
  isAuthorizedRouteWatchCronRequest,
  processDueRouteWatches,
} from "@/services/routeWatchProcessor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorizedRouteWatchCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await processDueRouteWatches();
    return Response.json(counts);
  } catch (error) {
    console.error(
      "[route-watch-updates:cron-failed]",
      error instanceof Error ? { message: error.message } : { message: "Unknown cron failure" },
    );
    return Response.json(
      {
        processed: 0,
        initialized: 0,
        checked: 0,
        notified: 0,
        skippedPreferences: 0,
        skippedSuppressed: 0,
        skippedPriceAlert: 0,
        skippedThreshold: 0,
        skippedDuplicate: 0,
        expired: 0,
        failed: 1,
      },
      { status: 500 },
    );
  }
}
