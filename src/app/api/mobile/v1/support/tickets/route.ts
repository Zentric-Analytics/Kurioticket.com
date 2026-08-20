import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { supportTicketSchema } from "@/lib/validation";
import { createSupportTicket } from "@/services/supportService";

type MobileSupportSession = { user: { id: string; email: string | null; status: string } } | null;
type Dependencies = {
  session: (request: Request) => Promise<MobileSupportSession>;
  create: typeof createSupportTicket;
};

export function createMobileSupportHandler(deps: Dependencies = {
  session: getMobileSession,
  create: createSupportTicket,
}) {
  return async function POST(request: Request) {
    const payload: unknown = await request.json().catch(() => null);
    const parsed = supportTicketSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your support request and try again." }, { status: 400 });
    }

    const session = await deps.session(request);
    const user = session?.user.status === "ACTIVE" && session.user.email ? session.user : null;
    try {
      const ticket = await deps.create({
        ...parsed.data,
        userId: user?.id,
        email: user?.email ?? parsed.data.email,
        sourceContext: {
          page: "mobile_support",
          platform: request.headers.get("x-mobile-platform") === "ios" ? "ios" : "android",
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
