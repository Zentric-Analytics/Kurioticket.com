/** Share the open product-details URL without treating a cancelled share as success.
 * Clipboard fallback must be confirmed before any optional analytics is sent.
 */
export type ProductShareOutcome = "shared" | "copied" | "cancelled" | "unavailable";
type ShareCapabilities = {
  share?: (data: ShareData) => Promise<unknown>;
  copy?: (value: string) => Promise<void>;
};
export async function shareProductLink(
  data: { title: string; text?: string; url: string },
  capabilities?: ShareCapabilities,
): Promise<ProductShareOutcome> {
  const browser = typeof navigator !== "undefined" ? navigator : null;
  const share = capabilities ? capabilities.share : browser?.share?.bind(browser);
  const copy = capabilities ? capabilities.copy : browser?.clipboard?.writeText?.bind(browser.clipboard);
  if (share) {
    try {
      await share(data);
      return "shared";
    } catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return "cancelled";
    }
  }
  try {
    if (!copy) return "unavailable";
    await copy(data.url);
    return "copied";
  } catch {
    return "unavailable";
  }
}
