"use client";

import { useEffect, useRef } from "react";

const discardEvent = "cms:before-discard";
const releaseEvent = "cms:release-navigation";

/** Also used by inline repair and revision restoration, which do not follow links. */
export function requestCmsDiscard() {
  return window.dispatchEvent(new Event(discardEvent, { cancelable: true }));
}
export function releaseCmsNavigationGuard() {
  window.dispatchEvent(new Event(releaseEvent));
}

export function useCmsNavigationGuard(dirty: boolean, pending: boolean) {
  const released = useRef(false);
  const approvedUnload = useRef(false);
  const approvedTraversal = useRef(false);

  useEffect(() => {
    function confirmLeave() {
      if (released.current) return true;
      if (pending) {
        window.alert("Please wait for the current CMS operation to finish before leaving.");
        return false;
      }
      return !dirty || window.confirm("Discard unsaved changes? Choose OK to discard and leave, or Cancel to stay and keep editing.");
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (approvedUnload.current) return;
      if (!released.current && (dirty || pending)) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.download || (anchor.target && anchor.target !== "_self")) return;
      const target = new URL(anchor.href, location.href);
      if (target.origin === location.origin && target.pathname === location.pathname && target.search === location.search && target.hash) return;
      if (!confirmLeave()) { event.preventDefault(); event.stopImmediatePropagation(); }
      else {
        // A confirmed external link should not immediately ask a second time
        // through the browser's native beforeunload dialog.
        approvedUnload.current = true;
        window.setTimeout(() => { approvedUnload.current = false; }, 0);
      }
    }
    function discard(event: Event) { if (!confirmLeave()) event.preventDefault(); }
    function release() { released.current = true; }

    // Modern browsers can cancel traversal before Next.js sees the new entry.
    type NavigationEvent = Event & { navigationType: string; canIntercept: boolean; hashChange: boolean };
    const navigation = (window as unknown as { navigation?: EventTarget }).navigation;
    function navigate(event: Event) {
      const nav = event as NavigationEvent;
      if (nav.navigationType !== "traverse" || nav.hashChange || !nav.canIntercept || !nav.cancelable) return;
      if (!confirmLeave()) nav.preventDefault();
      else {
        approvedTraversal.current = true;
        approvedUnload.current = true;
        window.setTimeout(() => { approvedTraversal.current = false; approvedUnload.current = false; }, 0);
      }
    }
    // On older browsers, stop the router's popstate handler when Stay is chosen
    // and restore the current URL/state. No synthetic history entries are added
    // until a traversal is actually declined.
    const currentUrl = location.href;
    const currentHistoryState = history.state;
    function popstate(event: PopStateEvent) {
      if (approvedTraversal.current) { approvedTraversal.current = false; return; }
      if (!confirmLeave()) {
        event.stopImmediatePropagation();
        history.pushState(currentHistoryState, "", currentUrl);
      }
    }
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", popstate, true);
    window.addEventListener(discardEvent, discard);
    window.addEventListener(releaseEvent, release);
    navigation?.addEventListener("navigate", navigate);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", popstate, true);
      window.removeEventListener(discardEvent, discard);
      window.removeEventListener(releaseEvent, release);
      navigation?.removeEventListener("navigate", navigate);
    };
  }, [dirty, pending]);
  return { allowNavigation: () => { released.current = true; } };
}
