export type ImagePattern = {
  protocol?: "http" | "https";
  hostname?: string;
  port?: string;
  pathname: string;
  search?: string;
};

type RemoteImagePattern = ImagePattern & {
  protocol: "http" | "https";
  hostname: string;
};

export const imageLocalPatterns: ImagePattern[] = [
  { pathname: "/images/cars/results/**", search: "?v=4x3-20260723" },
  { pathname: "/**", search: "" },
];

export const imageRemotePatterns: RemoteImagePattern[] = [
  { protocol: "https", hostname: "images.unsplash.com", port: "", pathname: "/**" },
  { protocol: "https", hostname: "images.pexels.com", port: "", pathname: "/**" },
  { protocol: "https", hostname: "photos.hotelbeds.com", port: "", pathname: "/giata/**" },
];

function wildcardPatternToRegExp(pattern: string) {
  const doubleWildcard = "__DOUBLE_WILDCARD__";
  const escaped = pattern
    .replaceAll("**", doubleWildcard)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", "[^/]*")
    .replaceAll(doubleWildcard, ".*");
  return new RegExp(`^${escaped}$`);
}

export function matchesImagePattern(url: URL, pattern: ImagePattern) {
  return (pattern.protocol === undefined || url.protocol === `${pattern.protocol}:`)
    && (pattern.hostname === undefined || wildcardPatternToRegExp(pattern.hostname).test(url.hostname))
    && (pattern.port === undefined || url.port === pattern.port)
    && wildcardPatternToRegExp(pattern.pathname).test(url.pathname)
    && (pattern.search === undefined || url.search === pattern.search);
}
