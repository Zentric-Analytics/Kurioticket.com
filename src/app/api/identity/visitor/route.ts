import { createIdentityHandlers } from "@/lib/visitor-identity-route";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import * as identity from "@/services/visitorIdentityService";

export const runtime = "nodejs";
const handlers = createIdentityHandlers({ transport: "web", authenticate: resolveOptionalWebApiSession, identity });
export const GET = handlers.GET;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
