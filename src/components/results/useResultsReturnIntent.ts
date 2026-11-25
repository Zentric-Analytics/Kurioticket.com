"use client";
import { useEffect } from "react";
import { clearResultsReturn, isResultsHref, markResultsReturn, type ResultsProduct } from "@/lib/results/resultsReturnIntent";

/** Mark only a real Back-to-results link or history traversal from details.
 * Viewing details alone never causes an unrelated later search to be restored.
 * The token is consumed once on the destination results page. */
export function useResultsReturnIntent(product: ResultsProduct, resultsHref: string) {
  useEffect(() => {
    if (!isResultsHref(product, resultsHref, window.location.href)) return;
    const remember = () => markResultsReturn(product, resultsHref,
      undefined, Date.now(), window.location.href);

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!link) return;
      if (isResultsHref(product, link.getAttribute("href") || "", window.location.href)) {
        remember();
        return;
      }
      if (product === "flight") clearResultsReturn("flight");
    };
    const onPopState = () => {
      if (isResultsHref(product, window.location.href, window.location.href)) remember();
      else if (product === "flight") clearResultsReturn("flight");
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [product, resultsHref]);
}
