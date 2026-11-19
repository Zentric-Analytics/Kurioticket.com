/** Best-effort operational telemetry only: never delay or change the provider checkout link. */
export function recordCarHandoffClick(resultId: string, offerId: string, sourcePage: "car-results" | "car-details", requestId?: string | null) {
  if (typeof navigator === "undefined") return;
  try {
    const payload = JSON.stringify({
      resultId, offerId, sourcePage,
      ...(requestId ? { requestId } : {}),
      handoffId: crypto.randomUUID(),
    });
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/cars/handoff", blob)) return;
    void fetch("/api/cars/handoff", {
      method: "POST", credentials: "same-origin", keepalive: true,
      headers: { "Content-Type": "application/json" }, body: payload,
    }).catch(() => {});
  } catch {
    // Optional analytics must not block any existing provider clickout.
  }
}
