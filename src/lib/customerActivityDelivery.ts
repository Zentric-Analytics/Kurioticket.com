import { getConfirmedBrowserAnalyticsProof, getConfirmedBrowserAnalyticsSignal } from "./analyticsConsentClient";
import { analyticsConfirmationHeader } from "./visitor-consent-constants";

type Endpoint = "/api/activity/page-views" | "/api/activity/interactions";
type Timer = ReturnType<typeof setTimeout>;
type Dependencies = {
  request: (url: Endpoint, init: RequestInit) => Promise<Response>;
  currentConsent: () => AbortSignal | null;
  confirmationProof?: (consent: AbortSignal) => string | null;
  schedule?: (callback: () => void, delay: number) => Timer;
  cancel?: (timer: Timer) => void;
};

const retryDelays = [250, 1000, 3000];
const attemptTimeoutMs = 5000;
const maxRetryAfterMs = 10_000;
const maxPending = 128;

/** Deliver only under the confirmation that was current at occurrence time. */
export function createCustomerActivityDelivery(dependencies: Dependencies) {
  const schedule = dependencies.schedule ?? setTimeout;
  const cancel = dependencies.cancel ?? clearTimeout;
  let pending = 0;

  return <Payload extends { eventId: string }>(endpoint: Endpoint, payload: Payload, consent: AbortSignal): boolean => {
    const eligible = () => !consent.aborted && dependencies.currentConsent() === consent;
    if (!eligible() || pending >= maxPending) return false;
    const proof = dependencies.confirmationProof?.(consent);
    if (dependencies.confirmationProof && !proof) return false;

    const body = JSON.stringify(payload);
    let attempts = 0;
    let finished = false;
    let retryTimer: Timer | undefined;
    let controller: AbortController | undefined;
    pending += 1;

    function stop() {
      if (finished) return;
      finished = true;
      pending -= 1;
      consent.removeEventListener("abort", stop);
      if (retryTimer !== undefined) cancel(retryTimer);
      controller?.abort();
    }

    async function attempt() {
      if (!eligible()) { stop(); return; }
      const requestController = new AbortController();
      controller = requestController;
      const timeout = schedule(() => requestController.abort(), attemptTimeoutMs);
      const delay = retryDelays[attempts++];
      let retry = false;
      let retryAfterMs = 0;
      try {
        const response = await dependencies.request(endpoint, {
          method: "POST", cache: "no-store", credentials: "same-origin", keepalive: true, referrerPolicy: "origin",
          signal: requestController.signal,
          headers: { "Content-Type": "application/json", Accept: "application/json", ...(proof ? { [analyticsConfirmationHeader]: proof } : {}) },
          body,
        });
        if (response.ok) {
          // A page may already exist and still have an explicitly pending
          // verified link. Retrying its occurrence UUID can enrich that row.
          const receipt = await response.json() as { retryable?: unknown } | null;
          retry = receipt?.retryable === true;
        } else if (response.status === 429 || response.status >= 500) {
          retry = true;
          const retryAfter = response.headers.get("Retry-After");
          if (retryAfter && /^\d+$/.test(retryAfter)) retryAfterMs = Number(retryAfter) * 1000;
        }
      } catch {
        retry = true;
      } finally {
        cancel(timeout);
        controller = undefined;
      }

      if (!eligible() || !retry || delay === undefined || retryAfterMs > maxRetryAfterMs) {
        stop();
        return;
      }
      retryTimer = schedule(() => { retryTimer = undefined; void attempt(); }, Math.max(delay, retryAfterMs));
    }

    consent.addEventListener("abort", stop, { once: true });
    void attempt();
    return true;
  };
}

export const deliverCustomerActivity = createCustomerActivityDelivery({
  request: (url, init) => fetch(url, init),
  currentConsent: getConfirmedBrowserAnalyticsSignal,
  confirmationProof: getConfirmedBrowserAnalyticsProof,
});
