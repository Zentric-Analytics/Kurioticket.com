// Capture the local consent generation used by the actual search request, after
// persisted identity/session loading. WeakMap metadata never enters JSON, caches
// written to disk, route parameters, provider requests or shared URLs.
const responseContexts = new WeakMap<object, number | null>();

export function rememberJourneyResponseContext(response: object, context: number | null) {
  responseContexts.set(response, context);
}

export function journeyResponseContext(response: object) {
  return responseContexts.get(response) ?? null;
}
