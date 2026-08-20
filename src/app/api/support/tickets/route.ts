import { NextResponse } from "next/server";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { supportTicketSchema } from "@/lib/validation";
import { createSupportTicket } from "@/services/supportService";
import { checkSupportSubmissionRateLimit, type SupportLimitResult } from "@/lib/support-submission-rate-limit";

const supportUnavailableMessage = "We could not save your support request right now. Please try again in a few minutes.";

type Dependencies = {
  session: () => Promise<Awaited<ReturnType<typeof resolveOptionalWebApiSession>>>;
  create: typeof createSupportTicket;
  limit: (request: Request, identity: { userId?: string; email: string }) => SupportLimitResult;
};

export function createWebSupportHandler(deps: Dependencies = {
  session: resolveOptionalWebApiSession,
  create: createSupportTicket,
  limit: checkSupportSubmissionRateLimit,
}) {
return async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    console.warn("[support] Invalid support ticket JSON payload", error);
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = supportTicketSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please add a little more support detail.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const session = (await deps.session())?.session;

  try {
    const limited = deps.limit(request, { userId: session?.user?.id, email: parsed.data.email });
    if (!limited.allowed) return NextResponse.json(
      { error: "Too many support requests. Please wait and try again.", retryAfterSeconds: limited.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
    const ticket = await deps.create({
      userId: session?.user?.id,
      ...parsed.data,
    });

    return NextResponse.json({ ticket: { id: ticket.id, subject: ticket.subject } }, { status: 201 });
  } catch (error) {
    console.error("[support] Failed to create support ticket", error);
    return NextResponse.json({ error: supportUnavailableMessage }, { status: 503 });
  }
};
}

export const POST = createWebSupportHandler();
