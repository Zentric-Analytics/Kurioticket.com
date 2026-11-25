/** Provider-neutral production metasearch primitives.
 *
 * A search is deliberately a single request/response operation.  Adapters may poll
 * internally, but the coordinator never exposes a mutable result set or a callback
 * through which an adapter can append offers after the completion barrier.
 */
export type MetasearchVertical = "flights" | "hotels" | "cars";

/** A real completion barrier, even for adapters that ignore AbortSignal.
 * Only the winning value escapes; listeners and timers are always released. */
export async function settleWithDeadline<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number, signal: AbortSignal | undefined, fallback: (reason: "cancelled" | "timeout" | "failed") => T): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("A positive provider deadline is required");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort = () => {};
  const terminal = new Promise<T>(resolve => {
    abort = () => { controller.abort(); resolve(fallback("cancelled")); };
    if (signal?.aborted) abort();
    else {
      signal?.addEventListener("abort", abort, {once:true});
      timer = setTimeout(() => { controller.abort(); resolve(fallback("timeout")); }, timeoutMs);
    }
  });
  try {
    if (signal?.aborted) return await terminal;
    return await Promise.race([Promise.resolve().then(()=>task(controller.signal)).catch(()=>fallback("failed")), terminal]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    controller.abort();
  }
}

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
  const completed = await Promise.all(providers.map(async provider => {
    const started = now();
    const bindings = new Map<string,string>();
    for (const location of locations) {
      const binding=location.bindings.find(candidate=>candidate.provider===provider.id);
      if(binding) bindings.set(location.canonicalId,binding.id);
    }
    const response = await settleWithDeadline(
      signal=>provider.search(query,bindings,signal),
      Math.min(provider.timeoutMs??options.deadlineMs,options.deadlineMs), options.signal,
      reason=>({offers:[] as readonly RawOffer[],status:reason==="failed"?"failed" as const:"timeout" as const,error:reason==="failed"?"provider_unavailable":reason==="cancelled"?"search_cancelled":"provider_timeout"}),
    );
    return {provider,response,latencyMs:now()-started};
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
