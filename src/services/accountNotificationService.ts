import { createNotificationEvent, type NotificationActionPath } from "@/services/notificationService";
type CreateAccountEvent = typeof createNotificationEvent;
let createAccountEventForTesting: CreateAccountEvent | null = null;

type AccountEventInput = {
  userId: string;
  email: string | null | undefined;
  eventKey: string;
  type: "ACCOUNT_UPDATE" | "SECURITY_UPDATE";
  title: string;
  body: string;
  actionPath: NotificationActionPath;
  metadata?: Record<string, unknown>;
};

export async function recordAccountEvent(input: AccountEventInput) {
  return (createAccountEventForTesting ?? createNotificationEvent)({
    userId: input.userId,
    eventKey: input.eventKey,
    type: input.type,
    title: input.title,
    body: input.body,
    actionPath: input.actionPath,
    metadata: input.metadata,
    email: input.email ? { kind: "transactional", to: input.email } : { kind: "none" },
  });
}

export const __accountNotificationServiceTest = { setCreateEvent(createEvent: CreateAccountEvent | null) { createAccountEventForTesting = createEvent; } };

export async function recordAccountEventSafely(input: AccountEventInput) {
  try { return await recordAccountEvent(input); }
  catch (error) {
    console.error("[account-event:persist-failed]", { userId: input.userId, eventKey: input.eventKey, type: input.type, message: error instanceof Error ? error.message : "notification_failed" });
    return null;
  }
}
