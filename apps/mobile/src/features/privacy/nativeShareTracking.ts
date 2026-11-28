import { Platform } from "react-native";
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from "expo-crypto";
import { deliverNativeInteraction } from "./nativeInteractionDelivery";
import { visitorIdentity } from "./visitorIdentity";
import { shareAndRecordObservedAction, type NativeShareOutcome } from "./nativeShareTrackingCore";

type Product = "FLIGHT" | "HOTEL" | "CAR";
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The event is optional, consented, and contains only an opaque hash of the
 * result reference. Use the existing first-party interaction API and its
 * account/visitor/search/environment checks. Never send share content.
 *
 * iOS reports a dismissedAction when the sheet was cancelled. Android's
 * sharedAction can mean that a chooser was used; it does NOT prove delivery.
 */
export async function shareNativeResult<T extends NativeShareOutcome>({
  share, product, resultId, requestId,
}: {
  share: () => Promise<T>;
  product: Product;
  resultId: string;
  requestId?: string | null;
}): Promise<T> {
  return shareAndRecordObservedAction({
    share,
    trackingContext: visitorIdentity.trackingContext,
    platform: Platform.OS,
    record: async (context, action) => {
      if (!resultId || resultId.length > 4096) return;
      const hashedResultId = await digestStringAsync(CryptoDigestAlgorithm.SHA256, resultId);
      // Check consent once more after hashing and before constructing a request.
      if (visitorIdentity.trackingContext() !== context) return;
      deliverNativeInteraction({
        action,
        product,
        resultId: hashedResultId,
        eventId: randomUUID(),
        ...(requestId && requestIdPattern.test(requestId) ? { requestId: requestId.toLowerCase() } : {}),
      }, context);
    },
  });
}
