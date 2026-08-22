import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { supportTicketSchema } from "@/lib/validation";
import { createSupportTicket } from "@/services/supportService";
import { checkSupportSubmissionRateLimit, type SupportLimitResult } from "@/lib/support-submission-rate-limit";

type MobileSupportSession = { user: { id: string; email: string | null; status: string } } | null;
type Dependencies = {
  session: (request: Request) => Promise<MobileSupportSession>;
  create: typeof createSupportTicket;
  limit: (request: Request, identity: { userId?: string; email: string }) => SupportLimitResult;
};

export function createMobileSupportHandler(deps: Dependencies = {
  session: getMobileSession,
  create: createSupportTicket,
  limit: checkSupportSubmissionRateLimit,
}) {
  return async function POST(request: Request) {
    const payload: unknown = await request.json().catch(() => null);
    const session = await deps.session(request).catch(() => null);
    if (session && session.user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const user = session?.user.email ? session.user : null;
    const candidate = user && typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? { ...payload, email: user.email }
      : payload;
    const parsed = supportTicketSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your support request and try again." }, { status: 400 });
    }

    try {
      const email = user?.email ?? parsed.data.email;
      const limited = deps.limit(request, { userId: user?.id, email });
      if (!limited.allowed) {
        return NextResponse.json(
          { error: "Too many support requests. Please wait and try again.", retryAfterSeconds: limited.retryAfterSeconds },
          { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
        );
      }
      const ticket = await deps.create({
        ...parsed.data,
        userId: user?.id,
        email,
        sourceContext: {
          page: "mobile_support",
          platform: "native",
        },
      });
      return NextResponse.json({ ticket: { id: ticket.id, subject: ticket.subject } }, { status: 201 });
    } catch (error) {
      console.error("[mobile-support] Failed to create support ticket", error);
      return NextResponse.json({ error: "We could not save your support request right now." }, { status: 503 });
    }
  };
}

export const POST = createMobileSupportHandler();
