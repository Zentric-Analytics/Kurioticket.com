export function favoriteAction(authenticatedUserId: string | null): "toggle" | "sign-in" {
  return authenticatedUserId ? "toggle" : "sign-in";
}
