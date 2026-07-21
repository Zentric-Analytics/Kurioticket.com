import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getCurrentDeletionRequest, requestAccountDeletion } from "@/services/accountDeletionService";

export const runtime = "nodejs";

function serialize(request: { id: string; status: string; requestedAt: Date; deletionScheduledAt: Date; cancelledAt?: Date | null; completedAt?: Date | null; supportTicketId?: string | null }) {
  return { id: request.id, status: request.status, requestedAt: request.requestedAt.toISOString(), deletionScheduledAt: request.deletionScheduledAt.toISOString(), cancelledAt: request.cancelledAt?.toISOString() || null, completedAt: request.completedAt?.toISOString() || null, supportTicketId: request.supportTicketId || null };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const request = await getCurrentDeletionRequest(session.user.id);
  return NextResponse.json({ request: request ? serialize(request) : null });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const { request, created } = await requestAccountDeletion({ userId, email });
    return NextResponse.json({ request: serialize(request), message: "Your account deletion request is under review. Your account is scheduled for permanent deletion in 7 days.", created }, { status: created ? 201 : 200 });
  } catch (error) {
    console.error("[account-security-deletion-request:post]", error);
    const message = error instanceof Error && error.message === "AdminDeletionBlocked" ? "Admin accounts cannot use self-service deletion." : "Unable to request account deletion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
