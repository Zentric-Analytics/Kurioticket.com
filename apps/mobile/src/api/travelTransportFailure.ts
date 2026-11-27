export type TravelFailureCode = "cancelled" | "superseded" | "ui-deadline" | "timeout" | "configuration" | "validation" | "rate-limit" | "unavailable" | "server" | "http" | "network" | "invalid-response" | "invalid-json" | "invalid-schema";
/** Never return native exception text, URLs, HTTP bodies or provider messages. */
export function describeTransportFailure(error: unknown, signal: AbortSignal, parent: AbortSignal | undefined, phase: "fetch" | "body"): { code: TravelFailureCode; message: string } {
  if (signal.aborted || parent?.aborted) {
    const reason = parent?.aborted ? parent.reason : signal.reason;
    if (reason === "ui-deadline") return { code: "ui-deadline", message: "Flight search took too long. Please try again." };
    if (reason === "superseded") return { code: "superseded", message: "Search cancelled." };
    if (parent?.aborted || reason !== "timeout") return { code: "cancelled", message: "Search cancelled." };
    return { code: "timeout", message: "The search took too long. Please try again." };
  }
  if (phase === "body" && error && typeof error === "object" && "name" in error && error.name === "SyntaxError") {
    return { code: "invalid-json", message: "The search provider returned an invalid response." };
  }
  return { code: "network", message: "The search service could not be reached. Check your connection and try again." };
}
