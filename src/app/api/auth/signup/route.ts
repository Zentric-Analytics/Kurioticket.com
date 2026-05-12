import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation";
import { createPasswordUser } from "@/services/authService";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the signup details.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await createPasswordUser(parsed.data);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
