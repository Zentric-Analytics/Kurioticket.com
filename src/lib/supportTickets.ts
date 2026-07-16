export const supportTicketStatuses = ["OPEN", "WAITING_ON_USER", "WAITING_ON_TEAM", "RESOLVED", "CLOSED"] as const;
export type SupportTicketStatusValue = (typeof supportTicketStatuses)[number];
