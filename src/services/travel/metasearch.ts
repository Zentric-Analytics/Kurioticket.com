/** Provider-neutral production metasearch primitives.
 *
 * A search is deliberately a single request/response operation.  Adapters may poll
 * internally, but the coordinator never exposes a mutable result set or a callback
 * through which an adapter can append offers after the completion barrier.
 */
export type MetasearchVertical = "flights" | "hotels" | "cars";

export type ProviderLocationBinding = {
  provider: string;
  id: string;
  kind?: string;
};

export type ResolvedLocation = {
  canonicalId: string;
  label: string;
  bindings: readonly ProviderLocationBinding[];
};

export type LocationResolution =
  | { status: "resolved"; location: ResolvedLocation }
  | { status: "ambiguous"; choices: readonly ResolvedLocation[] }
  | { status: "not-found" };

export type ProviderSearchResult<T> = {
  offers: readonly T[];
  /** A successful empty response is materially different from provider failure. */
  status: "success" | "failed" | "timeout";
  error?: string;
};

export interface MetasearchProvider<Query, RawOffer, Offer> {
  readonly id: string;
  readonly vertical: MetasearchVertical;
  readonly timeoutMs?: number;
  search(query: Query, bindings: ReadonlyMap<string, string>, signal: AbortSignal): Promise<ProviderSearchResult<RawOffer>>;
  normalize(raw: RawOffer): Offer | null;
}

export type ProviderCompletion = {
  provider: string;
  status: ProviderSearchResult<never>["status"];
  offerCount: number;
  latencyMs: number;
  error?: string;
};

export type CompletedMetasearch<Offer> = Readonly<{
  state: "results" | "no-inventory" | "unavailable";
  results: readonly Offer[];
  providers: readonly ProviderCompletion[];
  completedAt: number;
}>;

type SearchOptions<Offer> = {
  deadlineMs: number;
  dedupeKey: (offer: Offer) => string;
  compare: (left: Offer, right: Offer) => number;
  signal?: AbortSignal;
  now?: () => number;
};

/**
 * Runs every enabled adapter concurrently and crosses one bounded completion
 * barrier before normalization, deduplication and ranking. Timed-out work is
 * aborted and ignored, so it cannot mutate the returned payload later.
 */
export async function searchAllProviders<Query, RawOffer, Offer>(
  query: Query,
  locations: readonly ResolvedLocation[],
  providers: readonly MetasearchProvider<Query, RawOffer, Offer>[],
  options: SearchOptions<Offer>,
): Promise<CompletedMetasearch<Offer>> {
  if (!Number.isFinite(options.deadlineMs) || options.deadlineMs <= 0) {
    throw new Error("A positive metasearch deadline is required");
  }
  const now = options.now ?? Date.now;
  const barrierStarted = now();
  const barrier = new AbortController();
  const abort = () => barrier.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();

  const tasks = providers.map(async (provider) => {
    const started = now();
    const controller = new AbortController();
    const abortProvider = () => controller.abort(barrier.signal.reason);
    barrier.signal.addEventListener("abort", abortProvider, { once: true });
    const bindings = new Map<string, string>();
    for (const location of locations) {
      const binding = location.bindings.find((candidate) => candidate.provider === provider.id);
      if (binding) bindings.set(location.canonicalId, binding.id);
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutMs = Math.min(provider.timeoutMs ?? options.deadlineMs, options.deadlineMs);
      const timeout = new Promise<ProviderSearchResult<RawOffer>>((resolve) => {
        timer = setTimeout(() => {
          controller.abort("provider_timeout");
          resolve({ offers: [], status: "timeout", error: "provider_timeout" });
        }, timeoutMs);
      });
      const response = await Promise.race([provider.search(query, bindings, controller.signal), timeout]);
      return { provider, response, latencyMs: now() - started };
    } catch {
      return { provider, response: { offers: [], status: "failed" as const, error: "provider_unavailable" }, latencyMs: now() - started };
    } finally {
      if (timer) clearTimeout(timer);
      barrier.signal.removeEventListener("abort", abortProvider);
    }
  });

  let barrierTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    barrierTimer = setTimeout(() => { barrier.abort("search_deadline"); resolve(null); }, options.deadlineMs);
  });
  const settled = await Promise.race([Promise.all(tasks), deadline]);
  if (barrierTimer) clearTimeout(barrierTimer);
  barrier.abort("search_complete");
  options.signal?.removeEventListener("abort", abort);

  // A global deadline produces an explicit terminal status for every unfinished
  // adapter. Promise continuations have no reference to the output below.
  const completed = settled ?? providers.map((provider) => ({
    provider,
    response: { offers: [] as readonly RawOffer[], status: "timeout" as const, error: "search_deadline" },
    latencyMs: now() - barrierStarted,
  }));
  const unique = new Map<string, Offer>();
  for (const entry of completed) {
    if (entry.response.status !== "success") continue;
    for (const raw of entry.response.offers) {
      const offer = entry.provider.normalize(raw);
      if (offer) unique.set(options.dedupeKey(offer), unique.get(options.dedupeKey(offer)) ?? offer);
    }
  }
  const results = Object.freeze([...unique.values()].sort(options.compare));
  const providerStates = Object.freeze(completed.map(({ provider, response, latencyMs }) => ({
    provider: provider.id, status: response.status, offerCount: response.status === "success" ? response.offers.length : 0,
    latencyMs, ...(response.error ? { error: response.error } : {}),
  })));
  const anySuccess = providerStates.some((provider) => provider.status === "success");
  return Object.freeze({
    state: results.length ? "results" : anySuccess ? "no-inventory" : "unavailable",
    results,
    providers: providerStates,
    completedAt: now(),
  });
}

/** Exact provider bindings are required; a label or canonical ID is never sent as a substitute. */
export function requireProviderBinding(location: ResolvedLocation, provider: string): string {
  const matches = location.bindings.filter((binding) => binding.provider === provider);
  if (matches.length !== 1 || !matches[0].id.trim()) throw new Error(`Missing unambiguous ${provider} location binding`);
  return matches[0].id;
}
