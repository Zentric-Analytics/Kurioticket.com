import { resolveMobileVisitorAccount } from "@/lib/mobile-visitor-auth";
import { createIdentityHandlers } from "@/lib/visitor-identity-route";
import * as identity from "@/services/visitorIdentityService";

export const runtime = "nodejs";
const handlers = createIdentityHandlers({ transport: "native", authenticate: resolveMobileVisitorAccount, identity });
export const GET = handlers.GET;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
