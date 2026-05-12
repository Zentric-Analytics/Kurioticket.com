import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.info("[email:fallback]", input.subject, input.to);
    return { id: "resend-not-configured" };
  }

  const { data, error } = await resend.emails.send(
    {
      from: process.env.RESEND_FROM_EMAIL || "Curioticket <support@curioticket.com>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    },
    input.idempotencyKey ? { headers: { "Idempotency-Key": input.idempotencyKey } } : undefined,
  );

  if (error) throw new Error(error.message);
  return { id: data?.id };
}

export function priceAlertEmail(input: { name?: string | null; route: string; price: string; url: string }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">A meaningful price change was found</h1>
      <p>${input.name ? `Hi ${input.name},` : "Hi,"} Curioticket found an option for ${input.route} at ${input.price}.</p>
      <p>Review the route before booking. Prices and availability can change on the partner site.</p>
      <p><a href="${input.url}" style="color:#0f766e">View alert</a></p>
    </div>
  `;
}

export function supportTicketEmail(input: { ticketId: string; subject: string }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">We received your request</h1>
      <p>Your Curioticket support ticket is open.</p>
      <p><strong>Ticket:</strong> ${input.ticketId}</p>
      <p><strong>Subject:</strong> ${input.subject}</p>
      <p>Our team can help with Curioticket searches, alerts, premium tools, and travel guidance. Airlines and booking partners handle final bookings, check-in, changes, cancellations, and refunds.</p>
    </div>
  `;
}
