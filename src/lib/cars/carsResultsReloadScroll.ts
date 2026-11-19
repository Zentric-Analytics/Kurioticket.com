/**
 * Runs while the server-rendered Cars Results markup is still being parsed.
 *
 * Safari may restore a reload's saved scroll offset after React effects run, so
 * the reload entry must opt out of native restoration before hydration. The
 * policy is released as soon as this document is left; back/forward entries
 * therefore retain the browser's normal restoration behavior.
 */
export const CARS_RESULTS_RELOAD_SCROLL_SCRIPT = String.raw`
(() => {
  const navigation = performance.getEntriesByType("navigation")[0];
  if (!navigation || navigation.type !== "reload") return;

  const previousScrollRestoration = history.scrollRestoration;
  let active = true;
  const resetToTop = () => {
    if (active) window.scrollTo(0, 0);
  };
  const release = () => {
    if (!active) return;
    active = false;
    history.scrollRestoration = previousScrollRestoration;
    window.removeEventListener("DOMContentLoaded", resetToTop);
    window.removeEventListener("load", resetToTop);
    window.removeEventListener("pageshow", resetAfterPageShow);
  };
  const resetAfterPageShow = (event) => {
    if (!event.persisted) resetToTop();
  };

  history.scrollRestoration = "manual";
  resetToTop();
  window.addEventListener("DOMContentLoaded", resetToTop);
  window.addEventListener("load", resetToTop);
  window.addEventListener("pageshow", resetAfterPageShow);
  window.addEventListener("pagehide", release, { once: true });
})();
`;
