const KURIOTICKET_HOSTS = ["kurioticket.com"] as const;

export function validateProviderUrl(value: string, options: { production?: boolean } = {}) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const production = options.production ?? process.env.NODE_ENV === "production";
  if (production ? url.protocol !== "https:" : !["https:", "http:"].includes(url.protocol)) return null;
  if (!url.hostname || KURIOTICKET_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
  if (url.username || url.password) return null;
  return url.toString();
}

export function requireProviderUrl(value: string, options?: { production?: boolean }) {
  const url = validateProviderUrl(value, options);
  if (!url) throw new Error("A safe external provider URL is required.");
  return url;
}
