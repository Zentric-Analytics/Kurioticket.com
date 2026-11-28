"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

import { CookieConsentPresentation } from "./CookieConsentPresentation";
import { isCookiePolicyFromPreferences } from "@/lib/cookieConsentCopy";
import { isPublicWebsitePresenceRoute, websitePresenceHeartbeatMs } from "@/lib/website-presence";
import {
  analyticsConsentStorageKey,
  analyticsConsentChangedEvent,
  analyticsConsentAccountKey,
  analyticsDenialCookie,
  createVisitorConsentSynchronizer,
  getConfirmedBrowserAnalyticsSignal,
  hasAnalyticsDenial,
  isAnalyticsConsentStorageEvent,
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
    return await fetch(url, { ...init, signal: controller.signal, referrerPolicy: "origin" });
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
  // A new visitor may see a suggested On draft, but actual consent remains null
  // until an explicit choice. Never persist or sync this draft as consent.
  const [draftAnalytics, setDraftAnalytics] = useState(true);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [decisionPending, setDecisionPending] = useState(false);
  const [syncState, setSyncState] = useState<VisitorConsentSyncState>("idle");
  const choiceRef = useRef<AnalyticsConsentChoice>(null);
  const saveFailedRef = useRef(false);
  const decisionPendingRef = useRef(false);
  const revisionRef = useRef(0);
  const activeRef = useRef(false);
  const accountKeyRef = useRef<string | null>(null);
  const synchronizerRef = useRef<ReturnType<typeof createVisitorConsentSynchronizer> | null>(null);

  const accountKey = analyticsConsentAccountKey(status, session?.user);
  const pathname = usePathname();
  const consentConfirmed = syncState === "saved" && choice === "granted" && !decisionPending;
  useLayoutEffect(() => { accountKeyRef.current = accountKey; }, [accountKey]);

  useEffect(() => {
    activeRef.current = true;
    if (synchronizerRef.current === null) {
      synchronizerRef.current = createVisitorConsentSynchronizer({
        request: requestIdentity,
        bindBrowserConfirmation: true,
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
          if (activeRef.current) window.dispatchEvent(new CustomEvent(analyticsConsentChangedEvent, { detail: { confirmed: confirmed.choice === "granted", accountKey: confirmed.accountKey, proof: confirmed.proof } }));
          if (!activeRef.current || !decisionPendingRef.current || confirmed.choice !== choiceRef.current) return;
          decisionPendingRef.current = false;
          setEditing(false);
          setDecisionPending(false);
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
            credentials: "same-origin", cache: "no-store", signal: controller.signal, referrerPolicy: "origin",
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
        setDraftAnalytics(initialChoice !== "declined");
      }
      setReady(true);
    }

    void initialise();

    function handleStorage(event: StorageEvent) {
      // A delayed notification must reconcile the current preference, and a
      // sessionStorage clear does not change this origin's analytics choice.
      if (!isAnalyticsConsentStorageEvent(event)) return;
      const storedChoice = readSavedChoice();
      if (storedChoice !== "granted") setDenied(true);
      const nextChoice = isDenied() ? "declined" : storedChoice;
      revisionRef.current += 1;
      choiceRef.current = nextChoice;
      saveFailedRef.current = false;
      setChoice(nextChoice);
      setDraftAnalytics(nextChoice === "granted");
      // Reconfirm even when this tab's React preference value did not change.
      void synchronizerRef.current!.sync({ choice: nextChoice, accountKey: accountKeyRef.current }, true);
    }
    function openSettings() {
      if (isDenied()) { choiceRef.current = "declined"; setChoice("declined"); }
      setDraftAnalytics(choiceRef.current !== "declined");
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
          !getConfirmedBrowserAnalyticsSignal() || choiceRef.current !== "granted") return;
      void fetch("/api/identity/presence", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        referrerPolicy: "origin",
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

  const close = useCallback(() => {
    setEditing(false);
    setDraftAnalytics(choiceRef.current !== "declined");
  }, []);

  function openPreferences() {
    if (isDenied()) { choiceRef.current = "declined"; setChoice("declined"); }
    setDraftAnalytics(choiceRef.current !== "declined");
    setEditing(true);
  }

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
    setEditing(false);
    decisionPendingRef.current = true;
    setDecisionPending(true);
    void synchronizerRef.current!.sync({ choice: nextChoice, accountKey }, true);
  }

  // Keep first-visit decisions explicit, but permit policy access and avoid
  // blocking essential services while an explicit decision is synchronising.
  // A policy opened from preferences is read-only access, not a second consent
  // decision. The original tab keeps its unsaved draft. Footer controls remain usable.
  const readingPolicy = ready && typeof window !== "undefined" && isCookiePolicyFromPreferences(pathname, window.location.search);
  const showBanner = choice === null && !decisionPending && !readingPolicy;
  const isLegalPage = pathname === "/legal" || pathname?.startsWith("/legal/");
  const modal = editing || (choice === null && !isLegalPage && !decisionPending);
  if (!ready || (!editing && !showBanner && !decisionPending)) return null;

  return (
    <CookieConsentPresentation
      showBanner={showBanner}
      editing={editing}
      modal={modal}
      draftAnalytics={draftAnalytics}
      decisionPending={decisionPending}
      syncState={syncState}
      onOpen={openPreferences}
      onClose={close}
      onDraftChange={setDraftAnalytics}
      onChoose={choose}
      onRetry={retry}
    />
  );
}
