import { resolveMobileVisitorAccount } from "@/lib/mobile-visitor-auth";
import { createIdentityHandlers } from "@/lib/visitor-identity-route";
import * as identity from "@/services/visitorIdentityService";

export const runtime = "nodejs";
export const POST = createIdentityHandlers({ transport: "native", authenticate: resolveMobileVisitorAccount, identity }).MERGE;
