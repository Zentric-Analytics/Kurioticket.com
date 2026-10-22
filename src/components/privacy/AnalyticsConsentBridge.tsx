"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  analyticsConsentStorageKey,
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

  const user = session?.user;
  const verifiedAccount = status === "authenticated" && user?.status === "ACTIVE" && user.emailVerified
    && (!user.twoFactorEnabled || user.twoFactorVerified) && user.accountSessionId;
  const accountKey = status === "loading" ? null : verifiedAccount ? user.id : "guest";

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
      setDismissed(false);
    }
    function openSettings() {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (isDenied()) { choiceRef.current = "declined"; setChoice("declined"); }
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
    saveFailedRef.current = !saveChoice(nextChoice);
    setChoice(nextChoice);
    setDismissed(false);
    decisionPendingRef.current = true;
    setDecisionPending(true);
    void synchronizerRef.current!.sync({ choice: nextChoice, accountKey }, true);
  }

  if (!ready || (!editing && !(choice === null && !dismissed) && !decisionPending)) return null;

  return (
    <section
      role={editing ? "dialog" : "region"}
      aria-modal={editing ? false : undefined}
      aria-labelledby="analytics-consent-title"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[80] max-h-[80dvh] overflow-y-auto rounded-xl border border-border bg-surface p-4 text-navy shadow-lg sm:left-4 sm:right-auto sm:w-[420px]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="analytics-consent-title" ref={titleRef} tabIndex={-1} className="text-base font-semibold outline-none">Privacy choices</h2>
        <button type="button" aria-label="Close privacy choices" onClick={close} className="focus-ring -mr-1 -mt-1 rounded-md p-1.5"><X className="size-4" aria-hidden="true" /></button>
      </div>
      <p className="mt-2 text-sm leading-5 text-slate-600">
        Allow optional analytics to help us understand searches and provider handoffs. If you sign in, this activity can be linked to your account. You can change your choice in Privacy settings.
      </p>
      {editing && syncState === "saved" ? <p className="mt-2 text-sm">Analytics: {choice === "granted" ? "allowed" : "declined"}.</p> : null}
      <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-600">
        {syncState === "saving" ? "Saving your choice…" : syncState === "error" ? "We could not update analytics yet. Please retry." : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => choose("declined")}>Decline</Button>
        <Button type="button" variant="primary" size="sm" className="flex-1" onClick={() => choose("granted")}>Allow analytics</Button>
        {syncState === "error" ? <Button type="button" variant="ghost" size="sm" onClick={retry}>Retry</Button> : null}
      </div>
    </section>
  );
}
