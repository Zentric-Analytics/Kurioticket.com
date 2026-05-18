import { NextResponse } from "next/server";
import { DatabaseUnavailableError } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation";
import { DuplicateEmailError, createPasswordUser } from "@/services/authService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[signup:invalid-json]", error);
    return NextResponse.json({ error: "Unable to create account right now." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getPublicSignupValidationError(parsed.error.flatten().fieldErrors) }, { status: 400 });
  }

  try {
    const user = await createPasswordUser(parsed.data);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
  } catch (error) {
    console.error("[signup]", error);

    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    if (error instanceof DatabaseUnavailableError || isMissingMigrationError(error)) {
      return NextResponse.json({ error: "Unable to create account right now." }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to create account right now." }, { status: 400 });
  }
}

function getPublicSignupValidationError(fieldErrors: Record<string, string[] | undefined>) {
  if (fieldErrors.email?.length) return "Enter a valid email address.";
  if (fieldErrors.password?.length) return "Password must meet minimum requirements.";
  return "Unable to create account right now.";
}

function isMissingMigrationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /table .* does not exist|relation .* does not exist|database .* does not exist/i.test(message);
}
