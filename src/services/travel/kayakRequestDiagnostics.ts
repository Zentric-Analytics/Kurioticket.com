/** Fixed categories and server request IDs only; never tracking IDs or request material. */
export function kayakAgentKind(agent: string) {
  return /^KurioticketMobile\/[\w.+-]+ \(Android; Native\) OkHttp$/.test(agent) ? "android_application"
    : /^(okhttp|dalvik)\//i.test(agent) ? "android_transport"
    : /^Mozilla\//.test(agent) ? "browser" : "other";
}
export function kayakCorrelation(requestId?: string) {
  return typeof requestId === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)
    ? { requestId } : {};
}
export type KayakRequestPhase = "location" | "initial" | "poll" | "pages" | "metadata";
export type KayakPhaseDiagnostic = {
  requestId?: string; provider: "kayak_sandbox"; product: "flights" | "hotels" | "cars" | "unknown";
  phase: KayakRequestPhase; outcome: "started" | "response" | "failed"; attempt: number;
  agentKind: ReturnType<typeof kayakAgentKind>; incomingAgentKind: ReturnType<typeof kayakAgentKind>; httpStatus?: number;
};
