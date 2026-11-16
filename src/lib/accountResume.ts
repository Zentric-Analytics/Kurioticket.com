/** A focus/visibility pair represents one resume. No timers or polling. */
export function observeAccountResume(refresh: () => void, target: Pick<Window, "addEventListener" | "removeEventListener">, page: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">, now = Date.now) {
  let last = -Infinity;
  const resume = () => {
    if (page.visibilityState !== "visible" || now() - last < 250) return;
    last = now(); refresh();
  };
  target.addEventListener("focus", resume); page.addEventListener("visibilitychange", resume);
  return () => { target.removeEventListener("focus", resume); page.removeEventListener("visibilitychange", resume); };
}
