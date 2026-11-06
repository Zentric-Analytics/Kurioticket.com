/** Pure shared policy: usable in middleware without server-only dependencies. */
export function resolveAuthSecret(environment: { AUTH_SECRET?: string; NEXTAUTH_SECRET?: string }): string {
  return environment.AUTH_SECRET || environment.NEXTAUTH_SECRET || "";
}
