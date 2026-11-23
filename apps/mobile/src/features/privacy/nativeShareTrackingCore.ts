/** Native OS share sheets do not prove receipt by another person.
 * The only optional observation we record is an OS-reported shared action.
 * No recipient, share destination, text, screenshot or clipboard is collected.
 */
export type NativeShareOutcome = { action?: string };

/** A declined/withdrawn consent choice or an account switch cannot replay an
 * earlier share result. Sharing itself remains independent of analytics.
 */
export async function shareAndRecordObservedAction<T extends NativeShareOutcome>({
  share,
  trackingContext,
  record,
}: {
  share: () => Promise<T>;
  trackingContext: () => number | null;
  record: (context: number) => Promise<unknown>;
}): Promise<T> {
  const context = trackingContext();
  const result = await share();
  if (result?.action !== "sharedAction" || context === null || trackingContext() !== context) return result;
  try {
    await record(context);
  } catch {
    // Sharing is a customer feature. Optional analytics must never block it.
  }
  return result;
}
