import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin";
import { getEmailDeliveryHealthSnapshot } from "@/services/emailDeliveryService";
import { sendTransactionalEmail } from "@/services/emailService";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const fromConfigured = Boolean(process.env.RESEND_FROM_EMAIL?.trim());
  const webhookSecretConfigured = Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
  const health = await getEmailDeliveryHealthSnapshot();

  return NextResponse.json({
    configured: {
      resendApiKey: resendConfigured,
      resendFromEmail: fromConfigured,
      resendWebhookSecret: webhookSecretConfigured,
    },
    health,
  });
}

export async function POST() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const email = auth.session.user.email;
  if (!email) {
    return NextResponse.json({ error: "Admin email is unavailable." }, { status: 400 });
  }

  try {
    const result = await sendTransactionalEmail({
      to: email,
      subject: "Kurioticket production email test",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h1 style="font-size:22px">Kurioticket email test</h1>
          <p>This confirms Kurioticket can send transactional email from the active environment.</p>
        </div>
      `,
      template: "admin_test",
      idempotencyKey: `admin-email-test-${email}-${Date.now()}`,
      requireConfigured: true,
      metadata: { source: "admin-email-health" },
    });

    return NextResponse.json({ ok: true, providerMessageId: result.id });
  } catch (error) {
    console.error("[admin:email-health:test-failed]", error);
    return NextResponse.json({ error: "Unable to send test email." }, { status: 503 });
  }
}
