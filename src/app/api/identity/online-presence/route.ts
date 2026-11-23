import { createOnlinePresenceHandler } from "@/lib/onlinePresenceRoute";
import { presenceSigningSecret } from "@/lib/onlinePresenceCredential";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { recordOnlinePresence, reportOnlinePresenceIngestionFailure } from "@/services/onlinePresenceService";

export const runtime = "nodejs";

export const POST = createOnlinePresenceHandler("web", {
  environment: getPublicEnvironment,
  secret: presenceSigningSecret,
  automationSecret: () => process.env.ONLINE_PRESENCE_INGRESS_SECRET,
  async authenticate() {
    const session = (await resolveOptionalWebApiSession())?.accountSession;
    return session?.client === "WEB" ? session : null;
  },
  record: recordOnlinePresence,
  onFailure: reportOnlinePresenceIngestionFailure,
});
