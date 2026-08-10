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
  installUrl?: string | null;
  buildDetailsUrl?: string | null;
  submissionId?: string | null;
  appleBuildId?: string | null;
  failureReason?: string | null;
  completedAt?: string | null;
  recipientMemberIds?: string[];
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
    installUrl: cleanUrl(body.installUrl),
    buildDetailsUrl: cleanUrl(body.buildDetailsUrl),
    submissionId: cleanText(body.submissionId, 200),
    appleBuildId: cleanText(body.appleBuildId, 200),
    failureReason: cleanText(body.failureReason, 500),
    completedAt: cleanText(body.completedAt, 100),
    recipientMemberIds: Array.isArray(body.recipientMemberIds)
      ? body.recipientMemberIds.filter((value): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value)).slice(0, 500)
      : undefined,
  };
}

function validExpoAndroidInstallUrl(input: BuildNotification) {
  if (!input.installUrl) return false;
  try {
    const url = new URL(input.installUrl);
    return url.origin === "https://expo.dev"
      && url.pathname === `/accounts/zentric-analytics/projects/kurioticket-mobile/builds/${encodeURIComponent(input.buildId)}`
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function emailFor(input: BuildNotification) {
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

  let action = "";
  let details = "";
  if (success && input.platform === "android" && input.installUrl) {
    action = `<p><strong>Installation:</strong> Open the verified Expo install page on your Android device, then tap <strong>Install</strong>. Expo will provide the APK for this exact build.</p><p style="margin:24px 0"><a href="${escapeHtml(input.installUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Install Android Preview</a></p>`;
  } else if (success && input.platform === "ios") {
    action = `<p><strong>Installation:</strong> Open TestFlight on your registered device to install or update Kurioticket Preview.</p>`;
    details = input.buildDetailsUrl ? `<p><a href="${escapeHtml(input.buildDetailsUrl)}">View build details on Expo</a></p>` : "";
  } else {
    details = input.buildDetailsUrl ? `<p><a href="${escapeHtml(input.buildDetailsUrl)}">View build details on Expo</a></p>` : "";
  }

  const failure = !success && input.failureReason ? `<p><strong>Failure:</strong> ${escapeHtml(input.failureReason)}</p>` : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:680px"><h2>${escapeHtml(subject)}</h2><p>This notification was generated by the Kurioticket Preview release system for an exact verified native build.</p><table>${rowHtml}</table>${failure}${action}${details}<p style="color:#64748b;font-size:13px">Active, approved and unexpired Kurioticket Preview team members receive this message.</p></div>`;
  const textRows = rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n");
  const androidInstall = success && input.platform === "android" && input.installUrl
    ? `\nInstallation: Open this verified Expo page on your Android device, then tap Install: ${input.installUrl}`
    : "";
  const text = `${subject}\n\n${textRows}${input.failureReason ? `\nFailure: ${input.failureReason}` : ""}${androidInstall}${success && input.platform === "ios" ? "\nInstallation: Open TestFlight on your registered device." : ""}${input.platform !== "android" && input.buildDetailsUrl ? `\nBuild details: ${input.buildDetailsUrl}` : ""}`;
  return { subject, html, text };
}

export async function POST(request: Request) {
  if (!isStagingEnvironment()) return new NextResponse(null, { status: 404 });
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const raw = await request.json().catch(() => null) as Record<string, unknown> | null;
  const input = raw ? parseBody(raw) : null;
  if (!input) return NextResponse.json({ error: "Invalid build notification." }, { status: 400 });
  if (input.status === "SUCCESS" && input.platform === "android" && !validExpoAndroidInstallUrl(input)) {
    return NextResponse.json({ error: "Successful Android notifications require the exact Expo build install URL." }, { status: 400 });
  }
  const recipients = await getBuildNotificationRecipients(input.platform, input.recipientMemberIds);
  const message = emailFor(input);
  const outcomes = await Promise.all(recipients.map(async (recipient) => {
    // A delivery identity has one final outcome. Keeping status out of this key
    // prevents a later reconciliation error from sending a contradictory result.
    const idempotencyKey = `preview-build-final:${input.platform}:${input.buildId}:${recipient.id}`;
    const existing = await getEmailDeliveryReconciliationState(idempotencyKey);
    if (existing === "accepted") return { memberId: recipient.id, state: "accepted" as const };
    if (existing === "terminal") return { memberId: recipient.id, state: "terminal" as const };
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
      return { memberId: recipient.id, state: "sent" as const };
    } catch {
      return { memberId: recipient.id, state: "retryable-failure" as const };
    }
  }));
  const sent = outcomes.filter((outcome) => outcome.state === "sent").length;
  const alreadyAccepted = outcomes.filter((outcome) => outcome.state === "accepted").length;
  const terminal = outcomes.filter((outcome) => outcome.state === "terminal").length;
  const failed = outcomes.filter((outcome) => outcome.state === "retryable-failure").length;
  return NextResponse.json({ recipients: recipients.length, sent, alreadyAccepted, terminal, failed, recipientOutcomes: outcomes }, { status: failed ? 207 : 200 });
}
