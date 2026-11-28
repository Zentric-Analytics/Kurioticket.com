"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { createPageViewCapture, isCustomerPackageStagePath, isRestrictedWebSignIn } from "@/lib/pageViewCatalog";
import { analyticsConsentAccountKey, analyticsConsentChangedEvent, browserAllowsAnalytics, getConfirmedBrowserAnalyticsProof, getConfirmedBrowserAnalyticsSignal, isAnalyticsConsentStorageEvent, setBrowserAnalyticsAccount, setBrowserAnalyticsConfirmation } from "@/lib/analyticsConsentClient";
import { deliverCustomerActivity } from "@/lib/customerActivityDelivery";
import { createJourneyEventSender, forgetJourneySelections, journeyRequestId, readJourneySelection, rememberJourneySelection } from "@/lib/journeyEventClient";
import { createProviderHandoffMetadata, type ProviderHandoffMetadataReader } from "@/lib/providerHandoffClient";
import type { ClientJourneyDecisionType, JourneyFilterGroup, JourneySortMode, JourneySortChoice, JourneyFilterSelection, JourneyObservedResult, JourneySearchEditField } from "@/lib/search-journey";

type Recorder = {
  resultsViewed: (requestId: string | null) => void;
  observeCommittedPackageStage: (stage: string, pageInstance: string | null) => void;
  offerSelected: (product: "flight" | "hotel", resultId: string, provider?: string, requestId?: string | null) => void;
  rememberDetailsContext: (product: "flight" | "hotel", resultId: string, requestId: string | null) => void;
  prepareHandoff: (product: "flight" | "hotel", resultId: string) => ProviderHandoffMetadataReader;
  interactionRequestId: (product: "flight" | "hotel", resultId: string, explicit?: string | null) => string | null;
  workflowDecision: (type: ClientJourneyDecisionType, requestId: string | null | undefined, detail?: {
    sourcePage?: string; offerId?: string; filterGroup?: JourneyFilterGroup; sortMode?: JourneySortMode; sortChoice?: JourneySortChoice; filterSelections?: JourneyFilterSelection[]; observedResult?: JourneyObservedResult;
    editFields?: JourneySearchEditField[];
  }) => void;
};
const browserActionId = () => crypto.randomUUID();
const quiet: Recorder = { resultsViewed: () => undefined, observeCommittedPackageStage: () => undefined, offerSelected: () => undefined, rememberDetailsContext: () => undefined, prepareHandoff: () => createProviderHandoffMetadata(() => null, browserActionId), interactionRequestId: () => null, workflowDecision: () => undefined };
const JourneyEventsContext = createContext<Recorder>(quiet);

function subscribeVisibility(notify: () => void) {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
}
const pageIsVisible = () => document.visibilityState === "visible";
const serverVisibility = () => false;

/** Keep valid user-action delivery alive across internal navigation, but never across an account/consent change. */
export function JourneyEventsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const actor = analyticsConsentAccountKey(status, session?.user);
  const previousActor = useRef(actor);
  const [confirmation, setConfirmation] = useState<{ signal: AbortSignal | null; version: number }>({ signal: null, version: 0 });
  const [restoredVisit, setRestoredVisit] = useState(0);
  const visible = useSyncExternalStore(subscribeVisibility, pageIsVisible, serverVisibility);
  const pageContext = `${confirmation.version}:${restoredVisit}`;
  const pathname = usePathname();
  const [observePage] = useState(() => createPageViewCapture(() => crypto.randomUUID()));
  const [sender] = useState(() => createJourneyEventSender({
    request: (url, init) => fetch(url, init),
    allowed: () => getConfirmedBrowserAnalyticsSignal() !== null,
    confirmationProof: getConfirmedBrowserAnalyticsProof,
    eventId: () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "",
  }));

  useLayoutEffect(() => {
    if (actor && previousActor.current && previousActor.current !== actor) {
      try { forgetJourneySelections(window.sessionStorage); } catch { /* Optional storage. */ }
    }
    if (actor) previousActor.current = actor;
    setBrowserAnalyticsAccount(actor);
    sender.setContext(actor);
    sender.setConsent(false);
    return () => {
      setBrowserAnalyticsAccount(null);
      sender.setContext(null);
    };
  }, [actor, sender]);

  useEffect(() => {
    function setConsent(enabled: boolean, proof?: unknown) {
      if (!browserAllowsAnalytics()) {
        try { forgetJourneySelections(window.sessionStorage); } catch { /* Optional storage. */ }
      }
      const previousSignal = getConfirmedBrowserAnalyticsSignal();
      setBrowserAnalyticsConfirmation(actor, enabled, proof);
      const signal = getConfirmedBrowserAnalyticsSignal();
      if (previousSignal && signal !== previousSignal) sender.setConsent(false);
      sender.setConsent(signal !== null);
      setConfirmation(previous => previous.signal === signal ? previous : { signal, version: previous.version + 1 });
    }
    function changed(event: Event) {
      if (event instanceof CustomEvent && event.detail?.confirmed === true) {
        if (event.detail.accountKey === actor) setConsent(true, event.detail.proof);
      } else setConsent(false);
    }
    function storage(event: StorageEvent) {
      if (!isAnalyticsConsentStorageEvent(event)) return;
      // Another tab's grant still needs this tab's canonical identity synchronization.
      setConsent(false);
    }
    window.addEventListener(analyticsConsentChangedEvent, changed);
    window.addEventListener("storage", storage);
    return () => {
      sender.setConsent(false);
      window.removeEventListener(analyticsConsentChangedEvent, changed);
      window.removeEventListener("storage", storage);
    };
  }, [actor, sender]);

  useEffect(() => {
    function restored(event: PageTransitionEvent) {
      if (event.persisted) setRestoredVisit(previous => previous + 1);
    }
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  // Observe the currently visible, allowlisted route only after canonical
  // visitor consent is confirmed. Do not replay routes viewed before consent.
  useEffect(() => {
    const signal = getConfirmedBrowserAnalyticsSignal();
    if (typeof crypto.randomUUID !== "function") return;
    // Guided stage content must resolve before the package shell observes it.
    if (isCustomerPackageStagePath(pathname)) return;
    const event = observePage({
      requestId: new URLSearchParams(window.location.search).get("requestId"),
      pathname: isRestrictedWebSignIn(pathname, window.location.search, window.location.origin) ? null : pathname,
      transport: "web", context: signal && signal === confirmation.signal ? pageContext : null, visible,
    });
    if (event && signal) deliverCustomerActivity("/api/activity/page-views", event, signal);
  }, [actor, confirmation.signal, pathname, pageContext, visible, observePage]);

  // Refresh observers after a consent change. A visible result can be observed
  // starting at confirmation. Actions are eligible only when performed after it.
  const recorder: Recorder = !actor ? quiet : {
    observeCommittedPackageStage(stage, pageInstance) {
      const signal = getConfirmedBrowserAnalyticsSignal();
      const currentPath = window.location.pathname;
      if (!signal || signal !== confirmation.signal || pathname !== currentPath || typeof crypto.randomUUID !== "function"
        || !isCustomerPackageStagePath(currentPath, stage)) return;
      const event = observePage({ pathname: currentPath, transport: "web", context: pageContext, visible, pageInstance });
      if (event) deliverCustomerActivity("/api/activity/page-views", event, signal);
    },
    interactionRequestId(product, resultId, explicit) {
      if (!getConfirmedBrowserAnalyticsSignal()) return null;
      try { return journeyRequestId(explicit) ?? readJourneySelection(product, resultId, actor, window.sessionStorage); }
      catch { return null; }
    },
    prepareHandoff(product, resultId) {
      const context = sender.captureContext();
      return createProviderHandoffMetadata(() => context !== null && sender.captureContext() === context
        ? readJourneySelection(product, resultId, actor, window.sessionStorage) : null, browserActionId);
    },
    resultsViewed(requestId) {
      const signal = getConfirmedBrowserAnalyticsSignal();
      if (!requestId || !signal || signal !== confirmation.signal || !visible || typeof crypto.randomUUID !== "function") return;
      sender.send({ type: "RESULTS_VIEWED", requestId, sourcePage: window.location.pathname });
      if (isCustomerPackageStagePath(window.location.pathname)) return;
      const event = observePage({ pathname: window.location.pathname, transport: "web", context: pageContext, visible, requestId });
      if (event) deliverCustomerActivity("/api/activity/page-views", event, signal);
    },
    workflowDecision(type, requestId, detail) {
      if (!getConfirmedBrowserAnalyticsSignal()) return;
      const verifiedRequestId = journeyRequestId(requestId);
      if (!verifiedRequestId) return;
      sender.send({ type, requestId: verifiedRequestId, sourcePage: detail?.sourcePage ?? window.location.pathname,
        ...(detail?.offerId ? { offerId: detail.offerId } : {}),
        ...(detail?.filterGroup ? { filterGroup: detail.filterGroup } : {}),
        ...(detail?.sortMode ? { sortMode: detail.sortMode } : {}),
        ...(detail?.sortChoice ? { sortChoice: detail.sortChoice } : {}),
        ...(detail?.filterSelections ? { filterSelections: detail.filterSelections } : {}),
        ...(detail?.editFields?.length ? { editFields: detail.editFields } : {}),
        ...(detail?.observedResult ? { observedResult: detail.observedResult } : {}) });
    },
    rememberDetailsContext(product, resultId, requestId) {
      if (!getConfirmedBrowserAnalyticsSignal()) return;
      const valid = journeyRequestId(requestId);
      if (!valid) return;
      try { rememberJourneySelection(product, resultId, valid, actor, window.sessionStorage); }
      catch { /* No analytics event is emitted while opening details. */ }
    },
    offerSelected(product, resultId, provider, explicitRequestId) {
      if (!getConfirmedBrowserAnalyticsSignal()) return;
      try {
        const requestId = journeyRequestId(explicitRequestId) ?? readJourneySelection(product, resultId, actor, window.sessionStorage);
        if (!requestId) return;
        if (sender.send({ type: "OFFER_SELECTED", requestId, provider, sourcePage: window.location.pathname }) && explicitRequestId) {
          rememberJourneySelection(product, resultId, requestId, actor, window.sessionStorage);
        }
      } catch { /* Disabled storage or browser features must not block selecting an offer. */ }
    },
  };

  return <JourneyEventsContext.Provider value={recorder}>{children}</JourneyEventsContext.Provider>;
}

export const useJourneyEvents = () => useContext(JourneyEventsContext);
