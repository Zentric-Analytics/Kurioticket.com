/** Image enhancement starts after the controller publishes ready state. */
export function prefetchCarImagesInBackground(prefetch: () => Promise<unknown>): void {
  // A microtask also isolates synchronous native image errors. No inventory or
  // readiness state is owned by this optional work.
  void Promise.resolve().then(prefetch).catch(() => undefined);
}
