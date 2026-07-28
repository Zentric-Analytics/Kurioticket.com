import type { BootstrapStatus } from "./bootstrap";

export type StartupRoute = "/email-auth" | "/(tabs)" | null;

export function getStartupRoute(status: BootstrapStatus): StartupRoute {
  if (status === "ready-first-run") return "/email-auth";
  if (status === "ready-guest" || status === "ready-authenticated-reserved") return "/(tabs)";
  return null;
}
