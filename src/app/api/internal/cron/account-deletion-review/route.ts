import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { markDeletionRequestsReadyForReview } from "@/services/accountDeletionService";

export const runtime = "nodejs";

type Dependencies = {
  secret: () => string;
  markReady: typeof markDeletionRequestsReadyForReview;
};

function timingSafeCompare(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}

export function createAccountDeletionReviewCronHandler(dependencies: Dependencies) {
  return async function POST(request: Request) {
    const secret = dependencies.secret().trim();
    if (!secret) {
      return NextResponse.json(
        {
          error: "Account deletion review scheduler is not configured.",
          errorCode: "account_deletion_cron_not_configured",
        },
        { status: 503 },
      );
    }

    const authorization = request.headers.get("authorization")?.trim() || "";
    const [scheme, token, extra] = authorization.split(" ");
    if (scheme !== "Bearer" || !token || extra || !timingSafeCompare(token, secret)) {
      return NextResponse.json(
        {
          error: "Unauthorized account deletion review request.",
          errorCode: "account_deletion_cron_unauthorized",
        },
        { status: 401 },
      );
    }

    try {
      const result = await dependencies.markReady(new Date());
      return NextResponse.json({ markedReadyForReview: result.count });
    } catch (error) {
      console.error("[account-deletion:ready-review-cron]", error);
      return NextResponse.json(
        {
          error: "Unable to advance account deletion requests.",
          errorCode: "account_deletion_cron_failed",
        },
        { status: 500 },
      );
    }
  };
}

export const POST = createAccountDeletionReviewCronHandler({
  secret: () => process.env.ACCOUNT_DELETION_CRON_SECRET || "",
  markReady: markDeletionRequestsReadyForReview,
});
