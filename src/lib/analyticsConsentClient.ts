import { analyticsConfirmationHeader, analyticsConfirmationVersion, isAnalyticsConfirmationProof, visitorDenialCookieName } from "./visitor-consent-constants";

export type AnalyticsConsentChoice = "granted" | "declined" | null;

export const analyticsConsentStorageKey = "kurioticket:analytics-consent:v1";
export const analyticsConsentPolicyVersion = "analytics-v1";
export const openAnalyticsSettingsEvent = "kurioticket:open-privacy-settings";
export const analyticsConsentChangedEvent = "kurioticket:analytics-consent-changed";

/** Matches the consent bridge's verified account boundary; IDs remain local change signals. */
export function analyticsConsentAccountKey(status: string, user?: {
  id?: string;
  status?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorVerified?: boolean;
  accountSessionId?: string;
} | null): string | null {
  if (status === "loading") return null;
  const verified = status === "authenticated" && user?.status === "ACTIVE" && user.emailVerified
    && (!user.twoFactorEnabled || user.twoFactorVerified) && user.accountSessionId;
  return verified ? user.id ?? "guest" : "guest";
}

export function parseAnalyticsConsent(value: string | null): AnalyticsConsentChoice {
  return value === "granted" || value === "declined" ? value : null;
}

export function hasAnalyticsDenial(cookieHeader: string) {
  return cookieHeader.split(";").some((item) => item.trim() === `${visitorDenialCookieName}=1`);
}

export function analyticsDenialCookie(denied: boolean, secure: boolean) {
  return `${visitorDenialCookieName}=${denied ? "1" : ""}; Path=/; SameSite=Lax; Max-Age=${denied ? 60 * 60 * 24 * 365 : 0}${secure ? "; Secure" : ""}`;
}

let browserAnalyticsAccount: string | null = null;
let browserAnalyticsConfirmation: { controller: AbortController; proof: string } | null = null;

export function browserAllowsAnalytics() {
  try {
    return !hasAnalyticsDenial(document.cookie)
      && parseAnalyticsConsent(window.localStorage.getItem(analyticsConsentStorageKey)) === "granted";
  } catch {
    return false;
  }
}

export function isAnalyticsConsentStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== analyticsConsentStorageKey) return false;
  try { return event.storageArea === window.localStorage; }
  catch { return false; }
}

export function setBrowserAnalyticsAccount(accountKey: string | null) {
  if (browserAnalyticsAccount === accountKey) return;
  setBrowserAnalyticsConfirmation(browserAnalyticsAccount, false);
  browserAnalyticsAccount = accountKey;
}

/** Used by the consent bridge's consumer after canonical Visitor synchronization. */
export function setBrowserAnalyticsConfirmation(accountKey: string | null, confirmed: boolean, proof?: unknown) {
  if (accountKey !== browserAnalyticsAccount) return;
  const previous = browserAnalyticsConfirmation;
  if (accountKey && confirmed && isAnalyticsConfirmationProof(proof) && browserAllowsAnalytics()) {
    if (previous?.proof === proof) return;
    browserAnalyticsConfirmation = { controller: new AbortController(), proof };
  } else {
    browserAnalyticsConfirmation = null;
  }
  previous?.controller.abort();
}

/** In-memory permission for this document and actor only. Never a request credential. */
export function getConfirmedBrowserAnalyticsSignal(): AbortSignal | null {
  if (!browserAllowsAnalytics()) return null;
  return browserAnalyticsConfirmation?.controller.signal ?? null;
}

export function getConfirmedBrowserAnalyticsProof(signal = getConfirmedBrowserAnalyticsSignal()): string | null {
  return signal && signal === getConfirmedBrowserAnalyticsSignal() ? browserAnalyticsConfirmation!.proof : null;
}

/** A current refusal must not be replaced by an older successfully saved grant. */
export function resolveAnalyticsConsentChoice(input: {
  saved: AnalyticsConsentChoice;
  current: AnalyticsConsentChoice;
  saveFailed: boolean;
  denied: boolean;
}): AnalyticsConsentChoice {
  if (input.denied) return "declined";
  return input.saveFailed ? input.current : input.saved ?? input.current;
}

export type VisitorConsentContext = {
  choice: AnalyticsConsentChoice;
  /** A local change signal only. The server always resolves the real account. */
  accountKey: string | null;
};

export type VisitorConsentSyncState = "idle" | "saving" | "saved" | "error";

type Dependencies = {
  request: (url: string, init: RequestInit) => Promise<Response>;
  readChoice: () => AnalyticsConsentChoice;
  onState?: (state: VisitorConsentSyncState) => void;
  onSaved?: (context: VisitorConsentContext & { proof?: string }) => void;
  bindBrowserConfirmation?: boolean;
  exclusively?: <T>(work: () => Promise<T>) => Promise<T>;
};

/**
 * Serialises cookie mutations and reconciles the latest choice after every
 * response. In particular, a slow grant cannot be the final request after a
 * withdrawal, and stale sign-in work cannot link a newly signed-out browser.
 */
export function createVisitorConsentSynchronizer(dependencies: Dependencies) {
  let desired: VisitorConsentContext = { choice: null, accountKey: null };
  let revision = 0;
  let confirmedRevision = -1;
  let appliedKey: string | null = null;
  let appliedProof: string | undefined;
  let running: Promise<VisitorConsentSyncState> | null = null;
  let disposed = false;
  const controller = new AbortController();
  const exclusively = dependencies.exclusively ?? (async <T>(work: () => Promise<T>) => work());

  const contextKey = (context: VisitorConsentContext) => `${context.choice ?? "unknown"}:${context.accountKey ?? "loading"}`;

  function refreshChoice() {
    if (disposed) return;
    const choice = dependencies.readChoice();
    if (choice !== desired.choice) {
      desired = { ...desired, choice };
      revision += 1;
    }
  }

  async function mutate(url: string, method: "POST" | "DELETE", body?: unknown) {
    const response = await dependencies.request(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}),
        ...(dependencies.bindBrowserConfirmation && method === "POST" ? { [analyticsConfirmationHeader]: analyticsConfirmationVersion } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error("Could not update analytics preferences.");
    return response.json() as Promise<{ analyticsTracking?: string; merged?: boolean; confirmation?: { accountKey?: unknown; proof?: unknown } }>;
  }

  async function drain(): Promise<VisitorConsentSyncState> {
    while (true) {
      if (disposed) return "idle";
      refreshChoice();
      const current = { ...desired };
      const currentRevision = revision;
      const key = contextKey(current);
      if (current.accountKey === null || current.choice === null) {
        dependencies.onState?.("idle");
        return "idle";
      }
      if (appliedKey === key) {
        dependencies.onState?.("saved");
        if (!disposed && revision === currentRevision && confirmedRevision !== currentRevision) {
          confirmedRevision = currentRevision;
          dependencies.onSaved?.({ ...current, ...(appliedProof ? { proof: appliedProof } : {}) });
        }
        return "saved";
      }

      dependencies.onState?.("saving");
      let proof: string | undefined;
      try {
        await exclusively(async () => {
          refreshChoice();
          if (disposed || revision !== currentRevision) return;

          if (current.choice === "declined") {
            const response = await mutate("/api/identity/visitor", "DELETE");
            if (response.analyticsTracking !== "disabled") throw new Error("Withdrawal was not confirmed.");
            return;
          }

          const response = await mutate("/api/identity/visitor", "POST", {
            analytics: true,
            policyVersion: analyticsConsentPolicyVersion,
          });
          if (response.analyticsTracking !== "enabled") throw new Error("Consent was not confirmed.");

          refreshChoice();
          if (disposed || revision !== currentRevision) return;
          if (current.accountKey !== "guest") {
            const merged = await mutate("/api/identity/merge", "POST");
            if (!merged.merged) throw new Error("Account connection was not confirmed.");
            if (dependencies.bindBrowserConfirmation) {
              if (merged.confirmation?.accountKey !== current.accountKey || !isAnalyticsConfirmationProof(merged.confirmation.proof)) {
                throw new Error("Account connection changed.");
              }
              proof = merged.confirmation.proof;
            }
          } else if (dependencies.bindBrowserConfirmation) {
            if (response.confirmation?.accountKey !== "guest" || !isAnalyticsConfirmationProof(response.confirmation.proof)) {
              throw new Error("Visitor connection changed.");
            }
            proof = response.confirmation.proof;
          }
        });
      } catch {
        if (disposed) return "idle";
        refreshChoice();
        if (revision !== currentRevision) continue;
        dependencies.onState?.("error");
        return "error";
      }

      if (disposed) return "idle";
      refreshChoice();
      if (revision !== currentRevision) continue;
      appliedKey = key;
      appliedProof = proof;
      dependencies.onState?.("saved");
      if (!disposed && revision === currentRevision) {
        confirmedRevision = currentRevision;
        dependencies.onSaved?.({ ...current, ...(appliedProof ? { proof: appliedProof } : {}) });
      }
      return "saved";
    }
  }

  return {
    dispose() {
      disposed = true;
      controller.abort();
    },
    sync(next: VisitorConsentContext, force = false) {
      if (disposed) return Promise.resolve<VisitorConsentSyncState>("idle");
      if (contextKey(desired) !== contextKey(next)) {
        desired = { ...next };
        revision += 1;
      }
      if (force) appliedKey = null;
      if (!running) {
        running = Promise.resolve().then(async () => {
          let state: VisitorConsentSyncState;
          let processedRevision: number;
          do {
            processedRevision = revision;
            state = await drain();
          } while (!disposed && processedRevision !== revision);
          return state;
        }).finally(() => { running = null; });
      }
      return running;
    },
  };
}
