import {
  isAuthorizedSavedTripReminderCronRequest,
  processDueSavedTripReminders,
} from "@/services/savedTripReminderProcessor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorizedSavedTripReminderCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await processDueSavedTripReminders();
    return Response.json(counts);
  } catch (error) {
    console.error(
      "[saved-trip-reminders:cron-failed]",
      error instanceof Error ? { message: error.message } : { message: "Unknown cron failure" },
    );
    return Response.json(
      { processed: 0, sent: 0, skippedByPreferences: 0, notDue: 0, failed: 1 },
      { status: 500 },
    );
  }
}
