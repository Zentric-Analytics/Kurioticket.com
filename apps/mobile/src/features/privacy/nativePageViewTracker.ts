import { pageViewCanLink, pageViewKey, pageViewRequestId, type PageViewKey, type PageViewPayload } from "../../../../../src/lib/pageViewCatalog";
import { createNativeActivityDelivery } from "./nativeActivityDelivery";

type NavigationState = { index?: number; routes: readonly NavigationRoute[] };
type NavigationRoute = { key?: string; name: string; params?: object; state?: NavigationState };

/** Read only the focused, mounted navigator branch. Preloaded routes and a
 * redirect's requested child screens do not count as a committed arrival. */
export function activeNativeScreen(state: NavigationState | undefined) {
  const names: string[] = [];
  let screen: NavigationRoute | undefined;
  while (state && state.index !== undefined) {
    screen = state.routes[state.index];
    if (!screen?.key) return null;
    names.push(...screen.name.split("/"));
    state = screen.state;
  }
  if (!screen?.key || names.shift() !== "__root" || state) return null;
  const leaf = names.at(-1);
  if (!leaf || leaf === "profile" || leaf.startsWith("(")) return null;
  if (leaf === "index") names.pop();
  const segments = names.filter(name => name && !name.startsWith("("));
  const path = "/" + segments.join("/");
  const pageKey = (path === "/" && !names.includes("(tabs)")) || path === "/home"
    ? null : pageViewKey(path, "native");
  const requestId = pageKey?.endsWith("_details") && screen.params && "journeyRequestId" in screen.params
    ? pageViewRequestId(screen.params.journeyRequestId) : undefined;
  // React Navigation's instance key is local capture state only. It is never
  // forwarded to the API, even when multiple screens share one route template.
  return { pageKey, instance: screen.key, requestId };
}

type Dependencies = {
  context: () => number | null;
  createId: () => string;
  send: (event: PageViewPayload, context: number, signal: AbortSignal) => Promise<{ accepted: boolean; retryable?: boolean }>;
  delay?: (ms: number, signal: AbortSignal) => Promise<void>;
};

/** In-memory, consent-scoped delivery. Each real visit keeps its event ID
 * across retries and correlation enrichment. No pre-consent or disk backlog. */
export class NativePageViewTracker {
  private context: number | null = null;
  private current: PageViewPayload | null = null;
  private instance: string | undefined;
  private section: PageViewKey | null = null;
  private readonly delivery;
  constructor(private readonly deps: Dependencies) {
    this.delivery = createNativeActivityDelivery(deps);
  }
  contextChanged = () => {
    const context = this.deps.context();
    if (context === this.context) return;
    this.context = context;
    this.current = null;
    this.instance = undefined;
    this.section = null;
    this.delivery.contextChanged();
  };
  observe(key: PageViewKey | null, visible: boolean, reference?: unknown, instance?: string) {
    this.contextChanged();
    if (this.context === null || !visible) return;
    if (!key) { this.current = null; this.instance = undefined; this.section = null; return; }
    const requestId = pageViewCanLink(key) ? pageViewRequestId(reference) : undefined;
    if (this.current?.pageKey === key && instance === this.instance) {
      if (!requestId || this.current.requestId === requestId) return;
      if (!this.current.requestId) {
        this.current = { ...this.current, requestId };
        this.deliver(this.current);
        return;
      }
      // A different actual search on the same visible results screen.
    }
    const previousPageKey = this.section ?? this.current?.pageKey;
    this.current = { eventId: this.deps.createId(), pageKey: key, ...(previousPageKey ? { previousPageKey } : {}), ...(requestId ? { requestId } : {}) };
    this.instance = instance;
    this.section = null;
    this.deliver(this.current);
  }
  observeResult(key: PageViewKey, reference: unknown, instance?: string) {
    if (!pageViewCanLink(key) || !pageViewRequestId(reference)) return;
    this.observe(key, true, reference, instance);
  }
  observeHomeSection(key: PageViewKey) {
    this.contextChanged();
    if (this.context === null || this.current?.pageKey !== "home" || !key.startsWith("home_") || this.section === key) return;
    const previousPageKey = this.section ?? "home";
    this.section = key;
    this.deliver({ eventId: this.deps.createId(), pageKey: key, previousPageKey });
  }
  private deliver(event: PageViewPayload) {
    if (this.context !== null) this.delivery.deliver(event, this.context);
  }
}
