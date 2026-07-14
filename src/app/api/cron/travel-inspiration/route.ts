import {
  isAuthorizedTravelInspirationCronRequest,
  processTravelInspirationCampaign,
} from "@/services/travelInspirationCampaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorizedTravelInspirationCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await processTravelInspirationCampaign();
    return Response.json(counts);
  } catch (error) {
    console.error(
      "[travel-inspiration:cron-failed]",
      error instanceof Error ? { message: error.message } : { message: "Unknown cron failure" },
    );
    return Response.json(
      { processed: 0, eligible: 0, sent: 0, skippedByPreferences: 0, skippedAlreadySent: 0, failed: 1 },
      { status: 500 },
    );
  }
}
