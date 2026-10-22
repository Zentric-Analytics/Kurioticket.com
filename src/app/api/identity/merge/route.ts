import { createIdentityHandlers } from "@/lib/visitor-identity-route";
import { requireWebApiSession } from "@/lib/web-api-auth";
import * as identity from "@/services/visitorIdentityService";

export const runtime = "nodejs";
export const POST = createIdentityHandlers({ transport: "web", authenticate: requireWebApiSession, identity }).MERGE;
