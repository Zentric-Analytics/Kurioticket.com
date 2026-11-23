import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from "expo-crypto";
import { travelApi } from "../../api/travelApi";
import { visitorIdentity } from "./visitorIdentity";

type Product = "FLIGHT" | "HOTEL" | "CAR";
type Action = "saved_item_confirmed" | "saved_item_removed";
const safeReference = /^[A-Za-z0-9._:-]{1,128}$/;
const requestUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Called only after the account-backed save/remove API has finished.
 * The server independently checks the matching mutation audit and the exact
 * consented search owner; this event never asserts success on its own.
 */
export async function recordNativeSavedInteraction(input: {
  action: Action;
  product: Product;
  resultId: string;
  requestId?: string | null;
}): Promise<void> {
  if (!input.resultId || input.resultId.length > 4096) return;
  if (!input.requestId || !requestUuid.test(input.requestId)) return;
  const context = visitorIdentity.trackingContext();
  if (context === null) return;
  try {
    const resultId = safeReference.test(input.resultId) ? input.resultId
      : await digestStringAsync(CryptoDigestAlgorithm.SHA256, input.resultId);
    // The selected consent/account can change while hashing the result key.
    if (visitorIdentity.trackingContext() !== context) return;
    await travelApi.customerInteraction({
      action: input.action,
      product: input.product,
      resultId,
      eventId: randomUUID(),
      requestId: input.requestId.toLowerCase(),
    }, { visitorContext: context });
  } catch {
    // Optional analytics must not revert a confirmed account save/remove.
  }
}
