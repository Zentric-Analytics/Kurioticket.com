import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supportTicketSchema } from "@/lib/validation";
import { createSupportTicket } from "@/services/supportService";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const payload = await request.json();
  const parsed = supportTicketSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please add a little more support detail.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const ticket = await createSupportTicket({
    userId: session?.user?.id,
    ...parsed.data,
  });

  return NextResponse.json({ ticket: { id: ticket.id, subject: ticket.subject } }, { status: 201 });
}
