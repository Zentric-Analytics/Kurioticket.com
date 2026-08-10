import { canRetainStagingSession } from "@/lib/previewTesterAccess";

export async function canAuthenticateAccount(user: {
  id: string; email: string | null; emailVerified: Date | null; status: string;
}, method: "credentials" | "google" = "credentials") {
  if (!user.email || !user.emailVerified) return false;
  if (user.status !== "ACTIVE") return false;
  return canRetainStagingSession(user.email, method === "google");
}
