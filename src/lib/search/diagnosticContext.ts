import { AsyncLocalStorage } from "node:async_hooks";
import { createSearchDiagnostics, type SearchDiagnosticProduct } from "@/shared/search/diagnostics";
const context = new AsyncLocalStorage<ReturnType<typeof createSearchDiagnostics>>();
export function withSearchDiagnosticContext<T>(product: SearchDiagnosticProduct, requestId: string | undefined, task: () => Promise<T>, relatedRequestId?: string): Promise<T> {
  const trace = createSearchDiagnostics(product, requestId, "server", { span: "service" });
  trace("admission");
  if (relatedRequestId && relatedRequestId !== requestId) trace("correlation", { relatedRequestId });
  return context.run(trace, task);
}
export const currentSearchDiagnostics = () => context.getStore();
