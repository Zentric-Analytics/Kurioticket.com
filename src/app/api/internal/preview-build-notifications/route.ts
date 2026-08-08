import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import { getBuildNotificationRecipients } from "@/lib/teamAccess";
import { getEmailDeliveryReconciliationState } from "@/services/emailDeliveryReconciliation";
import { sendTransactionalEmail } from "@/services/emailService";

export const runtime = "nodejs";

type BuildNotification = {
  platform: "ios" | "android";
  status: "SUCCESS" | "FAILED";
  sourceSha: string;
  buildId: string;
  buildNumber?: string | null;
  appVersion?: string | null;
  runtimeVersion?: string | null;
  classification?: string | null;
  buildUrl?: string | null;
  buildDetailsUrl?: string | null;
  submissionId?: string | null;
  appleBuildId?: string | null;
  failureReason?: string | null;
  completedAt?: string | null;
};

function authorized(request: Request) {
  const expected = process.env.PREVIEW_BUILD_NOTIFICATION_SECRET?.trim() || "";
  const received = request.headers.get("x-kurioticket-preview-build-secret")?.trim() || "";
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cleanUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

function parseBody(body: Record<string, unknown>): BuildNotification | null {
  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : null;
  const status = body.status === "SUCCESS" || body.status === "FAILED" ? body.status : null;
  const sourceSha = typeof body.sourceSha === "string" && /^[0-9a-f]{40}$/i.test(body.sourceSha) ? body.sourceSha.toLowerCase() : null;
  const buildId = cleanText(body.buildId, 200);
  if (!platform || !status || !sourceSha || !buildId) return null;
  return {
    platform,
    status,
    sourceSha,
    buildId,
    buildNumber: cleanText(body.buildNumber, 100),
    appVersion: cleanText(body.appVersion, 100),
    runtimeVersion: cleanText(body.runtimeVersion, 100),
    classification: cleanText(body.classification, 200),
    buildUrl: cleanUrl(body.buildUrl),
    buildDetailsUrl: cleanUrl(body.buildDetailsUrl),
    submissionId: cleanText(body.submissionId, 200),
    appleBuildId: cleanText(body.appleBuildId, 200),
    failureReason: cleanText(body.failureReason, 500),
    completedAt: cleanText(body.completedAt, 100),
  };
}

function emailFor(input: BuildNotification) {
  const platformLabel = input.platform === "android" ? "Android" : "iOS";
  const success = input.status === "SUCCESS";
  const subject = success
    ? input.platform === "android"
      ? `Kurioticket Preview Android${input.buildNumber ? ` #${input.buildNumber}` : ""} is ready to install`
      : `Kurioticket Preview iOS${input.buildNumber ? ` #${input.buildNumber}` : ""} delivered to TestFlight`
    : `Kurioticket Preview ${platformLabel} build failed`;
  const rows: Array<[string, string | null | undefined]> = [
    ["Platform", platformLabel],
    ["Status", success ? "Successful" : "Failed"],
    ["Environment", "Preview"],
    ["Git branch", "dev"],
    ["Commit", input.sourceSha],
    ["App version", input.appVersion],
    ["Build number", input.buildNumber],
    ["Runtime", input.runtimeVersion],
    ["Release classification", input.classification],
    ["EAS build ID", input.buildId],
    ["EAS submission ID", input.submissionId],
    ["Apple build ID", input.appleBuildId],
    ["Completed", input.completedAt],
  ];
  const rowHtml = rows.filter(([, value]) => value).map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;color:#64748b">${escapeHtml(label)}</td><td style="padding:6px 0;font-family:monospace">${escapeHtml(String(value))}</td></tr>`).join("");
  const action = success && input.platform === "android" && input.buildUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(input.buildUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Install Android Preview</a></p>`
    : success && input.platform === "ios"
      ? `<p><strong>Installation:</strong> Open TestFlight on your registered device to install or update Kurioticket Preview.</p>`
      : "";
  const details = input.buildDetailsUrl ? `<p><a href="${escapeHtml(input.buildDetailsUrl)}">View build details on Expo</a></p>` : "";
  const failure = !success && input.failureReason ? `<p><strong>Failure:</strong> ${escapeHtml(input.failureReason)}</p>` : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:680px"><h2>${escapeHtml(subject)}</h2><p>This notification was generated by the Kurioticket Preview release system for an exact verified native build.</p><table>${rowHtml}</table>${failure}${action}${details}<p style="color:#64748b;font-size:13px">Only active Kurioticket Team Access members with the Developer role receive this message.</p></div>`;
  const textRows = rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n");
  const text = `${subject}\n\n${textRows}${input.failureReason ? `\nFailure: ${input.failureReason}` : ""}${success && input.platform === "android" && input.buildUrl ? `\nInstall Android Preview: ${input.buildUrl}` : ""}${success && input.platform === "ios" ? "\nInstallation: Open TestFlight on your registered device." : ""}${input.buildDetailsUrl ? `\nBuild details: ${input.buildDetailsUrl}` : ""}`;
  return { subject, html, text };
}

export async function POST(request: Request) {
  if (!isStagingEnvironment()) return new NextResponse(null, { status: 404 });
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const raw = await request.json().catch(() => null) as Record<string, unknown> | null;
  const input = raw ? parseBody(raw) : null;
  if (!input) return NextResponse.json({ error: "Invalid build notification." }, { status: 400 });
  if (input.status === "SUCCESS" && input.platform === "android" && !input.buildUrl) {
    return NextResponse.json({ error: "Successful Android notifications require an HTTPS build URL." }, { status: 400 });
  }
  const recipients = await getBuildNotificationRecipients(input.platform);
  const message = emailFor(input);
  const outcomes = await Promise.all(recipients.map(async (recipient) => {
    const idempotencyKey = `preview-build:${input.platform}:${input.buildId}:${input.status.toLowerCase()}:${recipient.id}`;
    const existing = await getEmailDeliveryReconciliationState(idempotencyKey);
    if (existing === "accepted") return "accepted" as const;
    if (existing === "terminal") return "terminal" as const;
    try {
      await sendTransactionalEmail({
        to: recipient.emailNormalized,
        subject: message.subject,
        html: message.html,
        text: message.text,
        template: "notification",
        requireConfigured: true,
        idempotencyKey,
        metadata: { type: "preview-build", platform: input.platform, status: input.status, buildId: input.buildId, sourceSha: input.sourceSha, recipientId: recipient.id },
      });
      return "sent" as const;
    } catch {
      return "retryable-failure" as const;
    }
  }));
  const sent = outcomes.filter((outcome) => outcome === "sent").length;
  const alreadyAccepted = outcomes.filter((outcome) => outcome === "accepted").length;
  const terminal = outcomes.filter((outcome) => outcome === "terminal").length;
  const failed = outcomes.filter((outcome) => outcome === "retryable-failure").length;
  return NextResponse.json({ recipients: recipients.length, sent, alreadyAccepted, terminal, failed }, { status: failed ? 207 : 200 });
}
