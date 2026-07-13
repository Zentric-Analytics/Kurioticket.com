import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  enableRouteWatch,
  pauseRouteWatch,
  routeWatchToggleSchema,
  RouteWatchNotFoundError,
  RouteWatchValidationError,
} from "@/services/routeWatchService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ savedSearchId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { savedSearchId } = await context.params;
  try {
    const result = await enableRouteWatch(session.user.id, savedSearchId);
    return NextResponse.json({ watch: result.watch }, { status: result.created ? 201 : 200 });
  } catch (error) {
    return routeWatchErrorResponse(error, "[route-watch:post]");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid route watch request.", code: "INVALID_PAYLOAD" }, { status: 400 });
  }
  const parsed = routeWatchToggleSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid route watch request.", code: "INVALID_PAYLOAD", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { savedSearchId } = await context.params;
  try {
    const watch = parsed.data.enabled
      ? (await enableRouteWatch(session.user.id, savedSearchId)).watch
      : await pauseRouteWatch(session.user.id, savedSearchId);
    return NextResponse.json({ watch });
  } catch (error) {
    return routeWatchErrorResponse(error, "[route-watch:patch]");
  }
}

function routeWatchErrorResponse(error: unknown, label: string) {
  if (error instanceof RouteWatchNotFoundError) {
    return NextResponse.json({ error: error.message, code: "NOT_FOUND" }, { status: 404 });
  }
  if (error instanceof RouteWatchValidationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
  }
  console.error(label, error);
  return NextResponse.json({ error: "Unable to update route watching." }, { status: 500 });
}
