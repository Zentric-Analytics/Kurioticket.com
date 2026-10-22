export type ProviderHandoffMetadata = { handoffId?: string; requestId?: string };
export type ProviderHandoffMetadataReader = () => ProviderHandoffMetadata;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const originalRequestId = (value: unknown) => typeof value === "string" && uuid.test(value) ? value.toLowerCase() : null;

/** One logical action keeps its receipt across transport retries. Correlation is
 * optional and is checked again at dispatch, after any session/storage awaits. */
export function createProviderHandoffMetadata(
  readRequestId: () => unknown,
  createId: () => string,
): ProviderHandoffMetadataReader {
  let handoffId: string | undefined;
  let requestId: string | null = null;
  try { handoffId = originalRequestId(createId()) ?? undefined; } catch { /* Optional logging must never prevent opening the provider. */ }
  try { requestId = originalRequestId(readRequestId()); } catch { /* Unavailable consent/context leaves the action uncorrelated. */ }
  let eligible = requestId !== null;

  return () => {
    try { eligible = eligible && originalRequestId(readRequestId()) === requestId; }
    catch { eligible = false; }
    return { ...(handoffId ? { handoffId } : {}), ...(eligible && requestId ? { requestId } : {}) };
  };
}
