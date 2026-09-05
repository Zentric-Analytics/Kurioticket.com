import { normalizePasskeyAssertion, type NormalizedPasskeyAssertion } from "../passkeys/passkeyAssertion";

type SessionResult = { session: { token: string; expires: string }; user: { id: string; email: string; name?: string | null } };
export type PasskeyStage = "assertion_received" | "assertion_normalized" | "verification_succeeded" | "session_persisting" | "session_persisted";
export type PasskeyDiagnosticStage = PasskeyStage | "auth_success_screen" | "navigation_requested" | "sign_in_failed";

export const isIOSPreviewPasskeyEnabled = (platform: string, isPreview: unknown) => platform === "ios" && isPreview === true;

export function safePasskeyFailureDetails(status: unknown, code: unknown) {
  const allowedCodes = ["INVALID_ASSERTION", "CHALLENGE_EXPIRED", "AUTHENTICATION_FAILED", "ABORTED"];
  return {
    status: typeof status === "number" && Number.isInteger(status) && (status === 0 || (status >= 100 && status <= 599)) ? status : 0,
    code: typeof code === "string" && allowedCodes.includes(code) ? code : "UNKNOWN",
  };
}

export function previewPasskeyErrorMessage(status?: number) {
  if (status === 429) return "Too many passkey attempts. Please wait and try again.";
  if (status === 0) return "Check your connection and try again.";
  return "Passkey sign-in could not be completed. Please try again or use email.";
}

// Never send a native view event directly: Fabric adds `target` to its payload.
// Keep signed bytes untouched and allowlist the WebAuthn credential fields.
export async function completePreviewPasskeySignIn(
  assertion: unknown,
  dependencies: {
    verify: (assertion: NormalizedPasskeyAssertion) => Promise<SessionResult>;
    persist: (result: SessionResult) => Promise<void>;
    trace: (stage: PasskeyStage) => void;
  },
) {
  dependencies.trace("assertion_received");
  const normalized = normalizePasskeyAssertion(assertion);
  dependencies.trace("assertion_normalized");
  const result = await dependencies.verify(normalized);
  dependencies.trace("verification_succeeded");
  if (!result?.session?.token || !result.user?.id || !result.user.email
    || !Number.isFinite(Date.parse(result.session.expires))
    || Date.parse(result.session.expires) <= Date.now()) {
    throw new Error("Passkey verification returned an invalid session.");
  }
  dependencies.trace("session_persisting");
  await dependencies.persist(result);
  dependencies.trace("session_persisted");
  return result;
}
