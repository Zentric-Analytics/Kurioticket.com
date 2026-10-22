"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { analyticsConsentAccountKey, analyticsConsentChangedEvent, analyticsConsentStorageKey, hasAnalyticsDenial, parseAnalyticsConsent } from "@/lib/analyticsConsentClient";
import { createJourneyEventSender, forgetJourneySelections, journeyRequestId, readJourneySelection, rememberJourneySelection } from "@/lib/journeyEventClient";

function browserAllowsAnalytics() {
  try { return !hasAnalyticsDenial(document.cookie) && parseAnalyticsConsent(window.localStorage.getItem(analyticsConsentStorageKey)) === "granted"; }
  catch { return false; }
}

type Recorder = {
  resultsViewed: (requestId: string | null) => void;
  offerSelected: (product: "flight" | "hotel", resultId: string, provider?: string, requestId?: string | null) => void;
};
const quiet: Recorder = { resultsViewed: () => undefined, offerSelected: () => undefined };
const JourneyEventsContext = createContext<Recorder>(quiet);

/** Keep valid user-action delivery alive across internal navigation, but never across an account/consent change. */
export function JourneyEventsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const actor = analyticsConsentAccountKey(status, session?.user);
  const previousActor = useRef(actor);
  const [, setConfirmation] = useState<{ actor: string | null; enabled: boolean }>({ actor: null, enabled: false });
  const [sender] = useState(() => createJourneyEventSender({
    request: (url, init) => fetch(url, init),
    allowed: browserAllowsAnalytics,
    eventId: () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "",
  }));

  useLayoutEffect(() => {
    if (actor && previousActor.current && previousActor.current !== actor) {
      try { forgetJourneySelections(window.sessionStorage); } catch { /* Optional storage. */ }
    }
    if (actor) previousActor.current = actor;
    sender.setContext(actor);
    sender.setConsent(false);
    return () => sender.setContext(null);
  }, [actor, sender]);

  useEffect(() => {
    function changed(event: Event) {
      const enabled = event instanceof CustomEvent && event.detail?.confirmed === true && event.detail?.accountKey === actor && browserAllowsAnalytics();
      if (!browserAllowsAnalytics()) {
        try { forgetJourneySelections(window.sessionStorage); } catch { /* Optional storage. */ }
      }
      sender.setConsent(enabled);
      setConfirmation({ actor, enabled });
    }
    function storage(event: StorageEvent) {
      if (event.key !== null && event.key !== analyticsConsentStorageKey) return;
      // Another tab's grant still needs this tab's canonical identity synchronization.
      if (!browserAllowsAnalytics()) {
        try { forgetJourneySelections(window.sessionStorage); } catch { /* Optional storage. */ }
      }
      sender.setConsent(false);
      setConfirmation({ actor, enabled: false });
    }
    window.addEventListener(analyticsConsentChangedEvent, changed);
    window.addEventListener("storage", storage);
    return () => {
      sender.setConsent(false);
      window.removeEventListener(analyticsConsentChangedEvent, changed);
      window.removeEventListener("storage", storage);
    };
  }, [actor, sender]);

  // Refresh observers after a consent change. The sender owns impression
  // deduplication and holds explicitly consented actions until confirmation.
  const recorder: Recorder = !actor ? quiet : {
    resultsViewed(requestId) {
      if (requestId) sender.send({ type: "RESULTS_VIEWED", requestId, sourcePage: window.location.pathname });
    },
    offerSelected(product, resultId, provider, explicitRequestId) {
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
