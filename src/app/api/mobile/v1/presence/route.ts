import { requireMobileSecurity } from "@/lib/mobile-security-route";
import { createOnlinePresenceHandler } from "@/lib/onlinePresenceRoute";
import { presenceSigningSecret } from "@/lib/onlinePresenceCredential";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { recordOnlinePresence, reportOnlinePresenceIngestionFailure } from "@/services/onlinePresenceService";

export const runtime = "nodejs";

export const POST = createOnlinePresenceHandler("native", {
  environment: getPublicEnvironment,
  secret: presenceSigningSecret,
  automationSecret: () => process.env.ONLINE_PRESENCE_INGRESS_SECRET,
  authenticate: requireMobileSecurity,
  record: recordOnlinePresence,
  onFailure: reportOnlinePresenceIngestionFailure,
});
