/** Native OS share sheets do not prove receipt by another person. */
export type NativeShareOutcome = { action?: string };
export type NativeShareObservation = "share_sheet_requested" | "share_sheet_completed";

/** A declined/withdrawn consent choice or an account switch cannot replay an
 * earlier share result. Sharing itself remains independent of analytics.
 */
export async function shareAndRecordObservedAction<T extends NativeShareOutcome>({
  share,
  trackingContext,
  record,
  platform,
}: {
  share: () => Promise<T>;
  trackingContext: () => number | null;
  record: (context: number, observation: NativeShareObservation) => Promise<unknown>;
  platform: string;
}): Promise<T> {
  const context = trackingContext();
  const result = await share();
  if (result?.action !== "sharedAction" || context === null || trackingContext() !== context) return result;
  // Android resolves sharedAction after requesting the chooser. Only iOS
  // distinguishes the OS-reported completion from dismissing the sheet.
  const observation = platform === "android" ? "share_sheet_requested" : platform === "ios" ? "share_sheet_completed" : null;
  if (!observation) return result;
  try {
    await record(context, observation);
  } catch {
    // Sharing is a customer feature. Optional analytics must never block it.
  }
  return result;
}
