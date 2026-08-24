export const protectedRoutes = ["/saved", "/recent", "/price-alerts", "/notifications", "/personal-information", "/security", "/email-preferences", "/travel-preferences", "/(tabs)/trips", "/(tabs)/profile"] as const;
export type ProtectedRoute = typeof protectedRoutes[number];
const allowed = new Set<string>(protectedRoutes);
export const defaultProtectedRoute: ProtectedRoute = "/(tabs)/profile";
export function validateSignInIntent(value: unknown): ProtectedRoute {
  if (typeof value !== "string") return defaultProtectedRoute;
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return defaultProtectedRoute; }
  if (decoded !== value && /\.\.|\/\//.test(decoded)) return defaultProtectedRoute;
  return allowed.has(value) ? value as ProtectedRoute : defaultProtectedRoute;
}
export function signInHref(returnTo: ProtectedRoute) { return { pathname: "/(tabs)/profile/sign-in" as const, params: { returnTo } }; }
