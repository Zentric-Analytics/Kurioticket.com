import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from "expo-crypto";
import { deliverNativeInteraction } from "./nativeInteractionDelivery";
import { visitorIdentity } from "./visitorIdentity";

type Product = "FLIGHT" | "HOTEL" | "CAR";
type Action = "saved_item_confirmed" | "saved_item_removed";
export type NativeSavedObservedResult = {
  label: string; provider: string; amount: number; currency: string;
  priceBasis: "total" | "per_night" | "per_day"; totalAmount?: number;
};
const safeDisplayedResult = (value: NativeSavedObservedResult | undefined): NativeSavedObservedResult | undefined => {
  if (!value) return undefined;
  const validText = (text: string, max: number) => typeof text === "string" && text.trim().length > 0
    && text.trim().length <= max && !/[\u0000-\u001f\u007f<>]/.test(text);
  if (!validText(value.label, 120) || !validText(value.provider, 100)
    || !Number.isFinite(value.amount) || value.amount <= 0 || value.amount > 1e9
    || !/^[A-Z]{3}$/.test(value.currency) || !["total", "per_night", "per_day"].includes(value.priceBasis)) return undefined;
  return { label: value.label.trim(), provider: value.provider.trim(), amount: value.amount,
    currency: value.currency, priceBasis: value.priceBasis,
    ...(typeof value.totalAmount === "number" && Number.isFinite(value.totalAmount)
      && value.totalAmount > 0 && value.totalAmount <= 1e9 ? { totalAmount: value.totalAmount } : {}) };
};
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
  observedResult?: NativeSavedObservedResult;
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
    deliverNativeInteraction({
      action: input.action,
      product: input.product,
      resultId,
      eventId: randomUUID(),
      requestId: input.requestId.toLowerCase(),
      ...(safeDisplayedResult(input.observedResult) ? { observedResult: safeDisplayedResult(input.observedResult) } : {}),
    }, context);
  } catch {
    // Optional analytics must not revert a confirmed account save/remove.
  }
}
