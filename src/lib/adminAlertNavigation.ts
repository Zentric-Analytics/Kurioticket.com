/** Alerts is global. A source action must open a real internal diagnostic,
 * not reload the current alert list or navigate outside the admin workspace. */
export function alertSourceHref(href: string): string | null {
  if (!href.startsWith("/admin/") || href.includes("\\")) return null;
  try {
    const url = new URL(href, "https://admin.invalid");
    if (url.origin !== "https://admin.invalid" || !url.pathname.startsWith("/admin/")) return null;
    if (url.pathname.replace(/\/+$/, "") === "/admin/notifications") return null;
    return href;
  } catch {
    return null;
  }
}
