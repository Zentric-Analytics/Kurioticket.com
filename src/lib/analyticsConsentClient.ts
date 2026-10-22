import { visitorDenialCookieName } from "./visitor-consent-constants";

export type AnalyticsConsentChoice = "granted" | "declined" | null;

export const analyticsConsentStorageKey = "kurioticket:analytics-consent:v1";
export const analyticsConsentPolicyVersion = "analytics-v1";
export const openAnalyticsSettingsEvent = "kurioticket:open-privacy-settings";

export function parseAnalyticsConsent(value: string | null): AnalyticsConsentChoice {
  return value === "granted" || value === "declined" ? value : null;
}

export function hasAnalyticsDenial(cookieHeader: string) {
  return cookieHeader.split(";").some((item) => item.trim() === `${visitorDenialCookieName}=1`);
}

export function analyticsDenialCookie(denied: boolean, secure: boolean) {
  return `${visitorDenialCookieName}=${denied ? "1" : ""}; Path=/; SameSite=Lax; Max-Age=${denied ? 60 * 60 * 24 * 365 : 0}${secure ? "; Secure" : ""}`;
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
  let appliedKey: string | null = null;
  let running: Promise<VisitorConsentSyncState> | null = null;
  const exclusively = dependencies.exclusively ?? (async <T>(work: () => Promise<T>) => work());

  const contextKey = (context: VisitorConsentContext) => `${context.choice ?? "unknown"}:${context.accountKey ?? "loading"}`;

  function refreshChoice() {
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
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error("Could not update analytics preferences.");
    return response.json() as Promise<{ analyticsTracking?: string; merged?: boolean }>;
  }

  async function drain(): Promise<VisitorConsentSyncState> {
    while (true) {
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
        return "saved";
      }

      dependencies.onState?.("saving");
      try {
        await exclusively(async () => {
          refreshChoice();
          if (revision !== currentRevision) return;

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
          if (revision !== currentRevision) return;
          if (current.accountKey !== "guest") {
            const merged = await mutate("/api/identity/merge", "POST");
            if (!merged.merged) throw new Error("Account connection was not confirmed.");
          }
        });
      } catch {
        refreshChoice();
        if (revision !== currentRevision) continue;
        dependencies.onState?.("error");
        return "error";
      }

      refreshChoice();
      if (revision !== currentRevision) continue;
      appliedKey = key;
      dependencies.onState?.("saved");
      return "saved";
    }
  }

  return {
    sync(next: VisitorConsentContext, force = false) {
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
          } while (processedRevision !== revision);
          return state;
        }).finally(() => { running = null; });
      }
      return running;
    },
  };
}
