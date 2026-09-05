// Preview-only coordinator. Native diagnostics contain no controller identifier,
// so ownership is scoped to the mounted email field and its installed challenge.
export function createPasskeyAuthorization() {
  let challenge: string | undefined;
  let generation = 0;
  let pending: Promise<void> | undefined;
  return {
    owns(value: string | undefined) { return Boolean(challenge && challenge === value); },
    get active() { return challenge !== undefined; },
    started(value: string | undefined) {
      if (!value || challenge === value) return;
      challenge = value;
      generation += 1;
    },
    terminal() { challenge = undefined; generation += 1; },
    async refresh<T>(allowed: () => boolean, load: () => Promise<T>, apply: (value: T) => void) {
      if (challenge || !allowed()) return;
      if (pending) return pending;
      const attempt = generation;
      const request = Promise.resolve().then(async () => {
        if (attempt !== generation || challenge || !allowed()) return;
        const value = await load();
        // Discard even if authorization started AND finished during this fetch.
        if (attempt === generation && !challenge && allowed()) apply(value);
      });
      pending = request;
      try { await request; } finally { if (pending === request) pending = undefined; }
    },
  };
}
