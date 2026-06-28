import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createSupportTicket } from "@/services/supportService";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (!userId || !email) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const ticket = await createSupportTicket({
      userId,
      email,
      subject: "Account deletion request",
      category: "account_deletion",
      body: "The signed-in user requested account deletion from Security Settings. Do not hard-delete automatically; review identity, bookings, support history, and retention obligations before processing.",
      sourceContext: { source: "dashboard-security", action: "account-deletion-request" },
    });

    return NextResponse.json({ request: { id: ticket.id } }, { status: 201 });
  } catch (error) {
    console.error("[account-security-deletion-request:post]", error);
    return NextResponse.json({ error: "Unable to request account deletion." }, { status: 500 });
  }
}
