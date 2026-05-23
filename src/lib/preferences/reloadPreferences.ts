export function reloadAfterPreferenceChange() {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.location.reload();
  }, 50);
}
