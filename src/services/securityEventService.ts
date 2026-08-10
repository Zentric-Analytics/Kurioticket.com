import { recordAccountEventSafely } from "@/services/accountNotificationService";

export type SecurityNotice = {
  userId: string;
  email?: string | null;
  securityEventId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

/** Delivery follows authoritative persistence and never rolls it back. */
export async function deliverSecurityEvent(input: SecurityNotice) {
  return recordAccountEventSafely({
    userId: input.userId,
    email: input.email,
    eventKey: `security:event:${input.securityEventId}`,
    type: "SECURITY_UPDATE",
    title: input.title,
    body: input.body,
    actionPath: "/settings",
    metadata: input.metadata,
  });
}
