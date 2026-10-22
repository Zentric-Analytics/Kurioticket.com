export type AnalyticsChoice = "unknown" | "granted" | "declined";
export type IdentitySession = { token: string; user: { id: string } } | null;
export type StoredVisitorIdentity = {
  choice: AnalyticsChoice;
  visitorToken: string | null;
  userId: string | null;
  pendingToken: string | null;
  pendingUserId: string | null;
  pendingWithdrawals: string[];
};
export type AnalyticsSnapshot = {
  loaded: boolean;
  choice: AnalyticsChoice;
  tracking: boolean;
  pending: boolean;
  error: boolean;
};
type Dependencies = {
  read: () => Promise<unknown>;
  write: (value: StoredVisitorIdentity) => Promise<void>;
  grant: (token: string | null, session: IdentitySession) => Promise<string>;
  merge: (token: string, session: NonNullable<IdentitySession>) => Promise<{ merged: boolean; visitorToken?: string }>;
  withdraw: (token: string) => Promise<void>;
  now?: () => number;
};

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const isMobileVisitorToken = (value: unknown): value is string => typeof value === "string" && tokenPattern.test(value);
const empty = (): StoredVisitorIdentity => ({ choice: "unknown", visitorToken: null, userId: null, pendingToken: null, pendingUserId: null, pendingWithdrawals: [] });

export function parseStoredVisitorIdentity(value: unknown): StoredVisitorIdentity {
  if (!value || typeof value !== "object") return empty();
  const stored = value as Partial<StoredVisitorIdentity>;
  const choice = stored.choice === "granted" || stored.choice === "declined" ? stored.choice : "unknown";
  const token = isMobileVisitorToken(stored.visitorToken) ? stored.visitorToken : null;
  const pendingToken = isMobileVisitorToken(stored.pendingToken) ? stored.pendingToken : null;
  const pendingWithdrawals = Array.isArray(stored.pendingWithdrawals) ? stored.pendingWithdrawals.filter(isMobileVisitorToken) : [];
  // A saved refusal must never restore its former token as an active identity.
  if (choice !== "granted" && token) pendingWithdrawals.push(token);
  if (choice !== "granted" && pendingToken) pendingWithdrawals.push(pendingToken);
  return {
    choice,
    visitorToken: choice === "granted" ? token : null,
    userId: choice === "granted" && token && typeof stored.userId === "string" ? stored.userId : null,
    pendingToken: choice === "granted" ? pendingToken : null,
    pendingUserId: choice === "granted" && pendingToken && typeof stored.pendingUserId === "string" ? stored.pendingUserId : null,
    pendingWithdrawals: [...new Set(pendingWithdrawals)],
  };
}

/** Only these first-party producers receive the optional visitor reference. */
export function isVisitorTrackedPath(path: string) {
  return ["/api/flights/search", "/api/hotels/search", "/api/mobile/v1/hotels/progressive", "/api/redirect"].includes(path);
}

export class VisitorIdentityCoordinator {
  private state = empty();
  private loaded = false;
  private loadTask?: Promise<void>;
  private session: IdentitySession = null;
  private sessionKnown = false;
  private revision = 0;
  private task?: Promise<void>;
  private rerun = false;
  private lastAttempt = -Infinity;
  private storageTask: Promise<void> = Promise.resolve();
  private storageRevision = 0;
  private storageDirty = false;
  private inFlightToken: string | null = null;
  private failed = false;
  private listeners = new Set<() => void>();

  constructor(private readonly dependencies: Dependencies) {}

  snapshot = (): AnalyticsSnapshot => ({
    loaded: this.loaded,
    choice: this.state.choice,
    tracking: this.state.choice === "granted" && Boolean(this.state.visitorToken) && this.sessionKnown && this.state.userId === (this.session?.user.id ?? null),
    pending: Boolean(this.task) || this.state.pendingWithdrawals.length > 0,
    error: this.failed,
  });

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish() { this.listeners.forEach(listener => listener()); }

  async load() {
    if (!this.loadTask) this.loadTask = this.dependencies.read().then(value => {
      this.state = parseStoredVisitorIdentity(value);
    }).catch(() => { this.failed = true; }).then(() => { this.loaded = true; this.publish(); });
    await this.loadTask;
  }

  private persist() {
    const value = { ...this.state, pendingWithdrawals: [...this.state.pendingWithdrawals] };
    const revision = ++this.storageRevision;
    this.storageDirty = true;
    const write = this.storageTask.catch(() => undefined).then(() => this.dependencies.write(value)).then(() => {
      if (revision === this.storageRevision) this.storageDirty = false;
    });
    this.storageTask = write;
    return write;
  }

  private queueWithdrawal(token: string | null) {
    if (token && !this.state.pendingWithdrawals.includes(token)) this.state.pendingWithdrawals.push(token);
  }

  private adoptSession(session: IdentitySession) {
    const previousUserId = this.session?.user.id;
    const changed = !this.sessionKnown || this.session?.user.id !== session?.user.id;
    const refreshed = this.session?.token !== session?.token;
    this.session = session;
    this.sessionKnown = true;
    if (changed) {
      this.revision += 1;
      // Anonymous -> signed in can be linked. An account-bound token cannot be
      // carried into a signed-out session or a different account on this device.
      if ((this.state.userId && this.state.userId !== session?.user.id) || (previousUserId && previousUserId !== session?.user.id)) {
        this.state.visitorToken = null;
        this.state.userId = null;
        this.state.pendingToken = null;
        this.state.pendingUserId = null;
        void this.persist().catch(() => { this.failed = true; this.publish(); });
      } else if (this.state.pendingUserId && this.state.pendingUserId !== session?.user.id) {
        this.state.visitorToken = null;
        this.state.userId = null;
        this.state.pendingToken = null;
        this.state.pendingUserId = null;
        void this.persist().catch(() => { this.failed = true; this.publish(); });
      }
      this.publish();
    }
    return changed || refreshed;
  }

  async transition(session: IdentitySession) {
    await this.load();
    if (this.adoptSession(session)) await this.refresh();
  }

  async choose(enabled: boolean) {
    await this.load();
    this.revision += 1;
    this.state.choice = enabled ? "granted" : "declined";
    this.failed = false;
    if (!enabled) {
      this.queueWithdrawal(this.state.visitorToken);
      this.queueWithdrawal(this.state.pendingToken);
      this.queueWithdrawal(this.inFlightToken);
      this.state.visitorToken = null;
      this.state.userId = null;
      this.state.pendingToken = null;
      this.state.pendingUserId = null;
    }
    this.publish();
    try { await this.persist(); }
    catch {
      // Never enable tracking if the explicit choice could not be retained.
      if (enabled) { this.state.choice = "declined"; this.state.visitorToken = null; this.state.userId = null; }
      this.failed = true;
      this.publish();
      if (!enabled) await this.refresh();
      throw new Error("Unable to save the analytics choice.");
    }
    await this.refresh();
  }

  async headers(path: string, session: IdentitySession): Promise<Record<string, string>> {
    if (!isVisitorTrackedPath(path)) return {};
    await this.load();
    const changed = this.adoptSession(session);
    // Network analytics work never delays search results or opening a deal.
    void this.refresh(changed);
    return this.snapshot().tracking ? { "x-kt-visitor": this.state.visitorToken! } : {};
  }

  refresh(force = true): Promise<void> {
    if (this.task) { if (force) this.rerun = true; return this.task; }
    const now = this.dependencies.now?.() ?? Date.now();
    if (!force && now - this.lastAttempt < 30_000) return Promise.resolve();
    this.lastAttempt = now;
    this.task = this.run().finally(() => { this.task = undefined; this.publish(); });
    this.publish();
    return this.task;
  }

  private async run() {
    do {
      this.rerun = false;
      try { await this.synchronize(); }
      catch { this.failed = true; }
      this.publish();
    } while (this.rerun);
  }

  private async synchronize() {
    await this.load();
    // Save a local refusal as soon as storage recovers, even while the server is
    // offline. A storage failure must not prevent attempted remote withdrawal.
    if (this.storageDirty) await this.persist().catch(() => undefined);
    for (const token of [...this.state.pendingWithdrawals]) {
      await this.dependencies.withdraw(token);
      this.state.pendingWithdrawals = this.state.pendingWithdrawals.filter(value => value !== token);
      await this.persist();
    }
    if (this.storageDirty) throw new Error("The analytics choice is not saved yet.");
    if (this.state.choice !== "granted" || !this.sessionKnown) { this.failed = false; return; }
    if (this.snapshot().tracking) { this.failed = false; return; }

    const revision = this.revision;
    const session = this.session;
    let token = await this.dependencies.grant(this.state.pendingToken ?? this.state.visitorToken, session);
    if (!isMobileVisitorToken(token)) throw new Error("Invalid visitor response.");
    this.inFlightToken = token;
    try {
      if (revision !== this.revision || this.state.choice !== "granted") {
        if (this.state.choice !== "granted") { this.queueWithdrawal(token); await this.persist(); }
        this.rerun = true;
        return;
      }
      // Keep a successful grant through a failed/ambiguous merge response. This
      // candidate is never eligible for request headers until linking succeeds.
      this.state.pendingToken = token;
      this.state.pendingUserId = session?.user.id ?? null;
      await this.persist();
      if (revision === this.revision && this.state.choice === "granted" && session) {
        const merged = await this.dependencies.merge(token, session);
        if (!merged.merged) throw new Error("Visitor connection is pending.");
        if (merged.visitorToken) {
          if (!isMobileVisitorToken(merged.visitorToken)) throw new Error("Invalid visitor response.");
          token = merged.visitorToken;
          this.inFlightToken = token;
          if (revision === this.revision && this.state.choice === "granted") {
            this.state.pendingToken = token;
            await this.persist();
          }
        }
      }
      if (revision !== this.revision || this.state.choice !== "granted") {
        if (this.state.choice !== "granted") { this.queueWithdrawal(token); await this.persist(); }
        this.rerun = true;
        return;
      }
      this.state.visitorToken = token;
      this.state.userId = session?.user.id ?? null;
      this.state.pendingToken = null;
      this.state.pendingUserId = null;
      await this.persist();
      this.failed = false;
    } finally {
      if (this.state.choice !== "granted") { this.queueWithdrawal(token); await this.persist(); this.rerun = true; }
      this.inFlightToken = null;
    }
  }
}
