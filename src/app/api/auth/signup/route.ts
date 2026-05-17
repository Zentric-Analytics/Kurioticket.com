import { NextResponse } from "next/server";
import { DatabaseUnavailableError } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation";
import { createPasswordUser } from "@/services/authService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit a valid JSON signup request." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please fix the highlighted signup details.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const user = await createPasswordUser(parsed.data);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
  } catch (error) {
    console.error("[signup]", error);

    if (error instanceof DatabaseUnavailableError) {
      return NextResponse.json(
        { error: "Database access is not available for this deployment. Check DATABASE_URL in the hosting environment." },
        { status: 503 },
      );
    }

    if (isMissingMigrationError(error)) {
      return NextResponse.json(
        { error: "Database tables are not ready yet. Run the Prisma migrations for this deployment, then try again." },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function isMissingMigrationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /table .* does not exist|relation .* does not exist|database .* does not exist/i.test(message);
}
