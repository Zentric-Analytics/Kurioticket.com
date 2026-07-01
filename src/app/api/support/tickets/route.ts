import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supportTicketSchema } from "@/lib/validation";
import { createSupportTicket } from "@/services/supportService";

const supportUnavailableMessage = "We could not save your support request right now. Please try again in a few minutes.";

export async function POST(request: Request) {
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

  const session = await getServerSession(authOptions);

  try {
    const ticket = await createSupportTicket({
      userId: session?.user?.id,
      ...parsed.data,
    });

    return NextResponse.json({ ticket: { id: ticket.id, subject: ticket.subject } }, { status: 201 });
  } catch (error) {
    console.error("[support] Failed to create support ticket", error);
    return NextResponse.json({ error: supportUnavailableMessage }, { status: 503 });
  }
}
