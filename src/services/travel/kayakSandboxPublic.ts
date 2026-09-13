/** Browser-safe KAYAK sandbox URL policy. No transport or server dependencies. */
export const KAYAK_SANDBOX_ORIGIN = "https://sandbox-en-us.kayakaffiliates.com";

export function sandboxBookingUrl(value: unknown): string | null {
  try {
    const url = new URL(typeof value === "string" ? value : "");
    if (url.href === "https://affiliates.kayak.com/sandbox-clickout") return url.href;
    if (url.origin !== KAYAK_SANDBOX_ORIGIN || url.pathname !== "/in" || url.username || url.password) return null;
    const decoded = decodeURIComponent(url.search);
    if (/api[-_]?key|authorization|access[-_]?token/i.test(decoded)) return null;
    return url.href;
  } catch {
    return null;
  }
}
