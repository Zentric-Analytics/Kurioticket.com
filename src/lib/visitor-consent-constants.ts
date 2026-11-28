/** Browser-readable opt-out marker; never an identity or authentication credential. */
export const visitorDenialCookieName = "kt_analytics_denied";
export const analyticsConfirmationHeader = "x-kt-analytics-context";
export const analyticsConfirmationVersion = "confirmation-v1";
export const isAnalyticsConfirmationProof = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
