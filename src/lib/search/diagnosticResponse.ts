import { createSearchDiagnostics, type SearchDiagnosticProduct } from "@/shared/search/diagnostics";
/** One required serialization; never clone/consume a response for diagnostics. */
export function diagnosticSearchResponse(product: SearchDiagnosticProduct, requestId: string, value: unknown, init?: ResponseInit) {
  const trace = createSearchDiagnostics(product, requestId, "server", { span: "serialization" });
  const started = performance.now();
  const serialized = JSON.stringify(value);
  trace("serialization", { durationMs: performance.now() - started, bytes: Buffer.byteLength(serialized) });
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return new Response(serialized, { ...init, headers });
}
