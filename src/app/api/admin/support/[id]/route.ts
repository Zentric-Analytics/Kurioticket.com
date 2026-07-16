import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import { adminSupportReplySchema, adminSupportStatusSchema } from "@/lib/validation";
import { addAdminSupportReply, SupportTicketNotFoundError, updateSupportTicketStatus } from "@/services/supportService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type AdminSessionResult = Awaited<ReturnType<typeof requireAdminApiSession>>;

type AdminSupportMutationDependencies = {
  requireAdmin: typeof requireAdminApiSession;
  writeAuditLog: typeof writeAdminAuditLog;
};

let dependenciesForTesting: AdminSupportMutationDependencies | null = null;

function getDependencies() {
  return dependenciesForTesting ?? { requireAdmin: requireAdminApiSession, writeAuditLog: writeAdminAuditLog };
}

function getAdminSession(result: AdminSessionResult) {
  if ("response" in result && result.response) return { response: result.response };
  return { session: result.session };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const dependencies = getDependencies();
  const adminResult = getAdminSession(await dependencies.requireAdmin());
  if (adminResult.response) return adminResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = adminSupportReplySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Reply message is required." }, { status: 400 });

  try {
    const result = await addAdminSupportReply({ ticketId: id, body: parsed.data.body });
    await dependencies.writeAuditLog({
      adminUserId: adminResult.session.user.id,
      adminEmail: adminResult.session.user.email,
      action: "support_ticket.reply",
      targetType: "SupportTicket",
      targetId: result.ticket.id,
      targetEmail: result.ticket.email,
      metadata: { messageId: result.message.id, status: result.ticket.status },
      request,
    });

    return NextResponse.json({ message: result.message }, { status: 201 });
  } catch (error) {
    if (error instanceof SupportTicketNotFoundError) return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    console.error("[admin-support:reply] Failed to add reply", error);
    return NextResponse.json({ error: "Unable to add reply." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const dependencies = getDependencies();
  const adminResult = getAdminSession(await dependencies.requireAdmin());
  if (adminResult.response) return adminResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = adminSupportStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid ticket status." }, { status: 400 });

  try {
    const result = await updateSupportTicketStatus({ ticketId: id, status: parsed.data.status });
    await dependencies.writeAuditLog({
      adminUserId: adminResult.session.user.id,
      adminEmail: adminResult.session.user.email,
      action: "support_ticket.status_update",
      targetType: "SupportTicket",
      targetId: result.ticket.id,
      targetEmail: result.ticket.email,
      metadata: { previousStatus: result.previousStatus, nextStatus: result.ticket.status },
      request,
    });

    return NextResponse.json({ ticket: result.ticket });
  } catch (error) {
    if (error instanceof SupportTicketNotFoundError) return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    console.error("[admin-support:status] Failed to update status", error);
    return NextResponse.json({ error: "Unable to update ticket status." }, { status: 500 });
  }
}

export const __adminSupportTicketRouteTest = {
  setDependenciesForTesting(dependencies: AdminSupportMutationDependencies | null) {
    dependenciesForTesting = dependencies;
  },
};
