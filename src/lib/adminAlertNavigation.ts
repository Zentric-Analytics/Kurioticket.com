/** Alerts are managed in Settings. A source action must open a real internal diagnostic,
 * not reload the current alert list or navigate outside the admin workspace. */
export function alertSourceHref(href: string): string | null {
  if (!href.startsWith("/admin/") || href.includes("\\")) return null;
  try {
    const url = new URL(href, "https://admin.invalid");
    if (url.origin !== "https://admin.invalid" || !url.pathname.startsWith("/admin/")) return null;
    if (["/admin/notifications", "/admin/settings/notifications"].includes(url.pathname.replace(/\/+$/, ""))) return null;
    return href;
  } catch {
    return null;
  }
}
