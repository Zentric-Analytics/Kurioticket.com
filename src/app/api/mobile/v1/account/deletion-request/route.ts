import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { requestAccountDeletion } from "@/services/accountDeletionService";

type MobileSession = Awaited<ReturnType<typeof getMobileSession>>;
type DeletionResult = Awaited<ReturnType<typeof requestAccountDeletion>>;

type Dependencies = {
  getSession: (request: Request) => Promise<MobileSession>;
  requestDeletion: (input: { userId: string; email: string }) => Promise<DeletionResult>;
};

const dependencies: Dependencies = {
  getSession: getMobileSession,
  requestDeletion: requestAccountDeletion,
};

function serialize(request: DeletionResult["request"]) {
  return {
    id: request.id,
    status: request.status,
    requestedAt: request.requestedAt.toISOString(),
    deletionScheduledAt: request.deletionScheduledAt.toISOString(),
    cancelledAt: request.cancelledAt?.toISOString() || null,
    completedAt: request.completedAt?.toISOString() || null,
    supportTicketId: request.supportTicketId || null,
  };
}

export function createMobileAccountDeletionHandler(overrides: Dependencies = dependencies) {
  return async function POST(request: Request) {
    const session = await overrides.getSession(request);
    const email = session?.user.email;
    if (!session || session.user.status !== "ACTIVE" || !email) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    try {
      const result = await overrides.requestDeletion({ userId: session.user.id, email });
      return NextResponse.json({
        request: serialize(result.request),
        message: "Your account is disabled and the deletion request becomes eligible for review in 7 days. Retention requirements are reviewed before deletion is completed.",
        created: result.created,
      }, { status: result.created ? 201 : 200 });
    } catch (error) {
      const message = error instanceof Error && error.message === "AdminDeletionBlocked"
        ? "Admin accounts cannot use self-service deletion."
        : "Unable to request account deletion.";
      return NextResponse.json({ error: message }, { status: error instanceof Error && error.message === "AdminDeletionBlocked" ? 403 : 503 });
    }
  };
}

export const POST = createMobileAccountDeletionHandler();
