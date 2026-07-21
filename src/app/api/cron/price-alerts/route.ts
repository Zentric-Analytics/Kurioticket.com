import { processDuePriceAlerts, isAuthorizedCronRequest } from "@/services/priceAlertProcessor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await processDuePriceAlerts();
    return Response.json(counts);
  } catch (error) {
    console.error("[price-alerts:cron-failed]", error instanceof Error ? { message: error.message } : { message: "Unknown cron failure" });
    return Response.json({ processed: 0, sent: 0, skippedByPreferences: 0, notTriggered: 0, failed: 1 }, { status: 500 });
  }
}
