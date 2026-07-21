"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type NewsletterStatusResponse = {
  authenticated?: boolean;
  status?: "PENDING_CONFIRMATION" | "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINED" | "SUPPRESSED" | "NOT_FOUND";
};

/**
 * Lightweight homepage visibility gate.
 *
 * Rule:
 * - logged-out visitors keep seeing the homepage newsletter form
 * - logged-in visitors who never subscribed keep seeing the form
 * - logged-in visitors already subscribed do not see the homepage newsletter section
 *
 * This intentionally does not use useSession, DOM polling, MutationObserver, or
 * form prefill. It performs one non-blocking status request and only mutates the
 * section when the server confirms an authenticated SUBSCRIBED state.
 */
export function NewsletterSessionBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const controller = new AbortController();
    let cancelled = false;
    let hiddenSection: HTMLElement | null = null;
    const timeoutId = window.setTimeout(() => controller.abort(), 1800);

    async function hideHomepageNewsletterIfSubscribed() {
      try {
        const response = await fetch("/api/newsletter/subscribe", {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok || cancelled) return;

        const data = (await response.json()) as NewsletterStatusResponse;
        if (!data.authenticated || data.status !== "SUBSCRIBED") return;

        const emailInput = document.querySelector<HTMLInputElement>('main input[type="email"]');
        const form = emailInput?.closest("form");
        const section = form?.closest("section") as HTMLElement | null;

        if (!section || cancelled) return;

        hiddenSection = section;
        section.hidden = true;
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[newsletter:homepage-visibility]", error);
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    const idleId = window.setTimeout(() => {
      void hideHomepageNewsletterIfSubscribed();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(idleId);
      window.clearTimeout(timeoutId);
      controller.abort();
      if (hiddenSection) hiddenSection.hidden = false;
    };
  }, [pathname]);

  return null;
}
