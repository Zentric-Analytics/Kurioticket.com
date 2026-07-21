export type ApiBaseUrlResult =
  | { ok: true; baseUrl: string }
  | { ok: false; message: string };

export function normalizeApiBaseUrl(value: string | undefined): ApiBaseUrlResult {
  const trimmed = value?.trim();
  if (!trimmed) return { ok: false, message: "Kurioticket is unavailable right now." };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, message: "Kurioticket is unavailable right now." };
    url.pathname = url.pathname.replace(/\/+$/, "");
    return { ok: true, baseUrl: url.toString().replace(/\/+$/, "") };
  } catch { return { ok: false, message: "Kurioticket is unavailable right now." }; }
}

export function getApiBaseUrl(): ApiBaseUrlResult {
  return normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
}
