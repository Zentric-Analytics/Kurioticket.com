import Stripe from "stripe";
import { getBaseUrl, requireServerEnv } from "@/lib/env";
import { withOptionalDb } from "@/lib/prisma";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(requireServerEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2026-02-25.clover" as never,
      typescript: true,
    });
  }

  return stripeClient;
}

export async function createSubscriptionCheckout(input: {
  userId?: string;
  email?: string | null;
  interval: "month" | "year";
}) {
  const priceId =
    input.interval === "month" ? process.env.STRIPE_MONTHLY_PRICE_ID : process.env.STRIPE_YEARLY_PRICE_ID;
  if (!priceId) throw new Error(`Missing Stripe ${input.interval} price id.`);

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email || undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { userId: input.userId || "" },
    },
    success_url: `${getBaseUrl()}/dashboard/premium?checkout=success`,
    cancel_url: `${getBaseUrl()}/pricing?checkout=cancelled`,
    metadata: {
      userId: input.userId || "",
      interval: input.interval,
    },
    allow_promotion_codes: true,
  });

  return session.url;
}

export async function createBillingPortal(input: { customerId: string }) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: input.customerId,
    return_url: `${getBaseUrl()}/dashboard/premium`,
  });

  return session.url;
}

export async function syncStripeSubscription(event: Stripe.Event) {
  await withOptionalDb(
    async (db) => {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId && session.subscription) {
          await db.subscription.upsert({
            where: { stripeSubscriptionId: String(session.subscription) },
            create: {
              userId,
              stripeCustomerId: String(session.customer || ""),
              stripeSubscriptionId: String(session.subscription),
              status: "TRIALING",
            },
            update: {
              stripeCustomerId: String(session.customer || ""),
              status: "TRIALING",
            },
          });
          await db.user.update({ where: { id: userId }, data: { isPremium: true, role: "PREMIUM" } });
        }
      }

      if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        const period = subscription as Stripe.Subscription & {
          current_period_start?: number;
          current_period_end?: number;
        };
        const status = mapStripeStatus(subscription.status);
        const userId = subscription.metadata?.userId;
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodStart: period.current_period_start
              ? new Date(period.current_period_start * 1000)
              : undefined,
            currentPeriodEnd: period.current_period_end
              ? new Date(period.current_period_end * 1000)
              : undefined,
          },
        });
        if (userId) {
          await db.user.update({
            where: { id: userId },
            data: {
              isPremium: status === "ACTIVE" || status === "TRIALING",
              role: status === "ACTIVE" || status === "TRIALING" ? "PREMIUM" : "USER",
            },
          });
        }
      }
      return true;
    },
    false,
  );
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  if (status === "active") return "ACTIVE";
  if (status === "trialing") return "TRIALING";
  if (status === "past_due") return "PAST_DUE";
  if (status === "canceled") return "CANCELED";
  if (status === "unpaid") return "UNPAID";
  if (status === "paused") return "PAUSED";
  return "INCOMPLETE";
}
