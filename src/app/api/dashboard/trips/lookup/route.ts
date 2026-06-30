import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { emailSchema } from "@/lib/validation";
import { findUserTripBookingByReference } from "@/services/tripBookingService";

export const runtime = "nodejs";

const reservationLookupSchema = z.object({
  reservationCode: z.string().trim().min(1, "Reservation code is required.").max(80),
  email: emailSchema,
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Please check the reservation details." }, { status: 400 });
  }

  const parsed = reservationLookupSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the reservation details.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const sessionEmail = session.user.email?.toLowerCase() ?? "";

  if (!sessionEmail || parsed.data.email !== sessionEmail) {
    return reservationNotFoundResponse();
  }

  try {
    const trip = await findUserTripBookingByReference(
      session.user.id,
      parsed.data.reservationCode.toUpperCase(),
    );

    if (!trip) {
      return reservationNotFoundResponse();
    }

    return NextResponse.json({ reservation: trip, source: "database" });
  } catch (error) {
    console.error("[dashboard-trips-lookup:post]", error);
    return NextResponse.json({ error: "Unable to look up reservation." }, { status: 500 });
  }
}

function reservationNotFoundResponse() {
  return NextResponse.json(
    {
      error: "Reservation not found.",
      reservation: null,
      source: "database",
    },
    { status: 404 },
  );
}
