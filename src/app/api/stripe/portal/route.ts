import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { createBillingPortal } from "@/services/paymentService";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login is required." }, { status: 401 });
  }

  const subscription = await getPrisma().subscription.findFirst({
    where: { userId: session.user.id, stripeCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer is connected yet." }, { status: 404 });
  }

  const url = await createBillingPortal({ customerId: subscription.stripeCustomerId });
  return NextResponse.json({ url });
}
