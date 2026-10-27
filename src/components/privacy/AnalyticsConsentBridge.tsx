"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { isPublicWebsitePresenceRoute, websitePresenceHeartbeatMs } from "@/lib/website-presence";
import {
  analyticsConsentStorageKey,
  analyticsConsentChangedEvent,
  analyticsConsentAccountKey,
  analyticsDenialCookie,
  createVisitorConsentSynchronizer,
  hasAnalyticsDenial,
  openAnalyticsSettingsEvent,
  parseAnalyticsConsent,
  resolveAnalyticsConsentChoice,
  type AnalyticsConsentChoice,
  type VisitorConsentSyncState,
} from "@/lib/analyticsConsentClient";

function readSavedChoice() {
  try {
    return parseAnalyticsConsent(window.localStorage.getItem(analyticsConsentStorageKey));
  } catch {
    return null;
  }
}

function saveChoice(choice: Exclude<AnalyticsConsentChoice, null>) {
  try {
    window.localStorage.setItem(analyticsConsentStorageKey, choice);
    return true;
  } catch {
    // The in-memory choice remains usable when browser storage is unavailable.
    return false;
  }
}

function isDenied() {
  try { return hasAnalyticsDenial(document.cookie); } catch { return false; }
}

function setDenied(denied: boolean) {
  try { document.cookie = analyticsDenialCookie(denied, window.location.protocol === "https:"); } catch { /* Cookies may be unavailable. */ }
}

async function requestIdentity(url: string, init: RequestInit) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}

/** Mobile preview documents deliberately omit all website consent lifecycle work. */
export function AnalyticsConsentRouteBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!pathname || pathname === "/mobile/legal" || pathname.startsWith("/mobile/legal/")) return null;
  return children;
}

export function AnalyticsConsentBridge() {
  return <AnalyticsConsentRouteBoundary><WebsiteAnalyticsConsentBridge /></AnalyticsConsentRouteBoundary>;
}

/** Only the optional analytics flow depends on this component's network work. */
function WebsiteAnalyticsConsentBridge() {
  const { data: session, status } = useSession();
  const [choice, setChoice] = useState<AnalyticsConsentChoice>(null);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [decisionPending, setDecisionPending] = useState(false);
  const [syncState, setSyncState] = useState<VisitorConsentSyncState>("idle");
  const choiceRef = useRef<AnalyticsConsentChoice>(null);
  const saveFailedRef = useRef(false);
  const decisionPendingRef = useRef(false);
  const revisionRef = useRef(0);
  const activeRef = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const synchronizerRef = useRef<ReturnType<typeof createVisitorConsentSynchronizer> | null>(null);

  const accountKey = analyticsConsentAccountKey(status, session?.user);
  const pathname = usePathname();
  const consentConfirmed = syncState === "saved" && choice === "granted" && !decisionPending;

  useEffect(() => {
    activeRef.current = true;
    if (synchronizerRef.current === null) {
      synchronizerRef.current = createVisitorConsentSynchronizer({
        request: requestIdentity,
        readChoice: () => {
          const nextChoice = resolveAnalyticsConsentChoice({ saved: readSavedChoice(), current: choiceRef.current, saveFailed: saveFailedRef.current, denied: isDenied() });
          if (nextChoice !== choiceRef.current) {
            choiceRef.current = nextChoice;
            if (activeRef.current) setChoice(nextChoice);
          }
          return nextChoice;
        },
        onState: (nextState) => { if (activeRef.current) setSyncState(nextState); },
        onSaved: (confirmed) => {
          if (activeRef.current) window.dispatchEvent(new CustomEvent(analyticsConsentChangedEvent, { detail: { confirmed: confirmed.choice === "granted", accountKey: confirmed.accountKey } }));
          if (!activeRef.current || !decisionPendingRef.current || confirmed.choice !== choiceRef.current) return;
          decisionPendingRef.current = false;
          setEditing(false);
          setDismissed(true);
          setDecisionPending(false);
          returnFocusRef.current?.focus();
        },
        exclusively: async (work) => {
          // Web Locks serialise cookie changes across tabs where supported. The
          // synchronizer also rechecks storage after responses for other browsers.
          if (navigator.locks) return navigator.locks.request("kurioticket:analytics-consent", work);
          return work();
        },
      });
    }
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    const initialRevision = revisionRef.current;

    async function initialise() {
      const savedChoice = isDenied() ? "declined" : readSavedChoice();
      let initialChoice = savedChoice;
      if (!initialChoice) {
        try {
          const response = await fetch("/api/identity/visitor", {
            credentials: "same-origin", cache: "no-store", signal: controller.signal,
          });
          if (response.ok) {
            const result = await response.json() as { analyticsTracking?: string };
            if (result.analyticsTracking === "enabled") initialChoice = "granted";
          }
        } catch {
          // Unavailable status never constitutes consent.
        }
      }
      await Promise.resolve();
      if (cancelled) return;
      window.clearTimeout(timeout);
      if (controller.signal.aborted && !savedChoice) {
        if (activeRef.current) setReady(true);
        return;
      }
      if (revisionRef.current === initialRevision) {
        // A refusal can arrive in another tab while GET is in flight.
        if (isDenied()) initialChoice = "declined";
        choiceRef.current = initialChoice;
        if (initialChoice) saveFailedRef.current = !saveChoice(initialChoice);
        setChoice(initialChoice);
        setDraftAnalytics(initialChoice === "granted");
      }
      setReady(true);
    }

    void initialise();

    function handleStorage(event: StorageEvent) {
      if (event.key !== analyticsConsentStorageKey && event.key !== null) return;
      const storedChoice = event.key === null ? null : parseAnalyticsConsent(event.newValue);
      if (storedChoice !== "granted") setDenied(true);
      const nextChoice = isDenied() ? "declined" : storedChoice;
      revisionRef.current += 1;
      choiceRef.current = nextChoice;
      saveFailedRef.current = false;
      setChoice(nextChoice);
      setDraftAnalytics(nextChoice === "granted");
      setDismissed(false);
    }
    function openSettings() {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (isDenied()) { choiceRef.current = "declined"; setChoice("declined"); }
      setDraftAnalytics(choiceRef.current === "granted");
      setEditing(true);
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener(openAnalyticsSettingsEvent, openSettings);
    return () => {
      cancelled = true;
      activeRef.current = false;
      synchronizerRef.current?.dispose();
      synchronizerRef.current = null;
      controller.abort();
      window.clearTimeout(timeout);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(openAnalyticsSettingsEvent, openSettings);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void synchronizerRef.current!.sync({ choice, accountKey });
  }, [ready, choice, accountKey]);

  // Send presence only from a visible, consent-confirmed public website tab.
  // Stops immediately on consent withdrawal, sign-out, or route changes.
  useEffect(() => {
    if (!ready || !consentConfirmed || !accountKey || !isPublicWebsitePresenceRoute(pathname)) return;
    let active = true;
    const controller = new AbortController();
    const send = () => {
      if (!active || document.visibilityState !== "visible" || isDenied() ||
          readSavedChoice() !== "granted" || choiceRef.current !== "granted") return;
      void fetch("/api/identity/presence", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }).catch(() => { /* Optional telemetry; no user-facing navigation failure. */ });
    };
    send();
    const timer = window.setInterval(send, websitePresenceHeartbeatMs);
    const onVisible = () => { if (document.visibilityState === "visible") send(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, consentConfirmed, accountKey, pathname]);

  const retry = useCallback(() => {
    if (choiceRef.current) saveFailedRef.current = !saveChoice(choiceRef.current);
    if (ready) void synchronizerRef.current!.sync({ choice: choiceRef.current, accountKey }, true);
  }, [ready, accountKey]);

  useEffect(() => {
    if (syncState !== "error") return;
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    };
  }, [retry, syncState]);

  useEffect(() => {
    if (editing && ready) titleRef.current?.focus();
  }, [editing, ready]);

  const close = useCallback(() => {
    decisionPendingRef.current = false;
    setEditing(false);
    setDismissed(true);
    setDecisionPending(false);
    returnFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!editing) return;
    function handleKey(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editing, close]);

  function choose(nextChoice: Exclude<AnalyticsConsentChoice, null>) {
    revisionRef.current += 1;
    choiceRef.current = nextChoice;
    // This is the only place that clears a denial marker: an explicit Allow
    // click. Late network responses must never undo a newer refusal.
    setDenied(nextChoice !== "granted");
    window.dispatchEvent(new CustomEvent(analyticsConsentChangedEvent, { detail: { confirmed: false } }));
    saveFailedRef.current = !saveChoice(nextChoice);
    setChoice(nextChoice);
    setDraftAnalytics(nextChoice === "granted");
    setDismissed(false);
    decisionPendingRef.current = true;
    setDecisionPending(true);
    void synchronizerRef.current!.sync({ choice: nextChoice, accountKey }, true);
  }

  if (!ready || (!editing && !(choice === null && !dismissed) && !decisionPending)) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/30 p-3 sm:p-6">
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="analytics-consent-title"
        className="flex max-h-[min(86dvh,670px)] w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-border bg-surface text-navy shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="analytics-consent-title" ref={titleRef} tabIndex={-1} className="text-lg font-semibold outline-none">Cookie preferences</h2>
          <button type="button" aria-label="Close cookie preferences" onClick={close} className="focus-ring rounded-md p-1.5"><X className="size-4" aria-hidden="true" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-sm leading-6 text-slate-600">
            Essential cookies are always active for security, requested searches, operational search records and provider handoff continuity. Optional analytics measures engagement and usage patterns across visits and can be switched off.
          </p>
          <Button type="button" variant="primary" size="sm" className="w-full" onClick={() => choose("granted")}>Accept all optional cookies</Button>
          <h3 className="text-sm font-semibold">Manage consent preferences</h3>
          <details className="border-b border-slate-200 pb-3">
            <summary className="flex cursor-pointer items-center justify-between gap-3 py-2 text-sm font-semibold">
              <span>Essential cookies</span>
              <span className="text-xs font-medium text-slate-500">Always active</span>
            </summary>
            <p className="pt-2 text-sm leading-5 text-slate-600">
              Always active for secure sign-in, requested flight, hotel and car searches, operational search records, troubleshooting and the necessary connection between a search and a provider handoff. The operational credential is short-lived; retained records follow our data-retention policy. This does not enable optional behavioural analytics.
            </p>
          </details>
          <details className="border-b border-slate-200 pb-3">
            <summary className="flex cursor-pointer items-center justify-between gap-3 py-2 text-sm font-semibold">
              <span>Analytics cookies</span>
              <span className="text-xs font-medium text-slate-500">Optional</span>
            </summary>
            <p className="pt-2 text-sm leading-5 text-slate-600">
              With your permission, measures visitor engagement, browsing patterns and feature usage across visits to improve Kurioticket. Turning this off does not stop necessary searches or operational records.
            </p>
          </details>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
            <span>Allow optional analytics</span>
            <input
              type="checkbox"
              checked={draftAnalytics}
              onChange={event => setDraftAnalytics(event.target.checked)}
              className="h-5 w-5 accent-violet-700"
            />
          </label>
          {editing && syncState === "saved" ? <p className="text-xs text-slate-600">Analytics: {choice === "granted" ? "allowed" : "disabled"}.</p> : null}
          <p role="status" aria-live="polite" className="text-sm text-slate-600">
            {syncState === "saving" ? "Saving your choice…" : syncState === "error" ? "We could not update your preferences. Please retry." : null}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <a href="/legal/cookie-policy" className="text-xs font-medium text-violet-700 underline underline-offset-2">Cookie policy</a>
          <div className="flex gap-2">
            {syncState === "error" ? <Button type="button" variant="secondary" size="sm" onClick={retry}>Retry</Button> : null}
            <Button type="button" variant="primary" size="sm" onClick={() => choose(draftAnalytics ? "granted" : "declined")}>Save preferences</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
