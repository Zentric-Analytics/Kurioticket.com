import { isValidEmail } from "./authUtils";

export type PasskeyDiagnostic = { stage: string; rpId?: string; domain?: string; code?: number };

export function emailFieldError(email: string, touched: boolean, previewNative: boolean, submitted = false) {
  // Apple's credential UI can blur an empty username field without an email edit.
  if (previewNative && !email.trim() && !submitted) return undefined;
  return touched && !isValidEmail(email) ? "Enter a valid email address." : undefined;
}

export function createPasskeyFieldRecovery(dependencies: {
  currentChallenge: () => string | undefined;
  canRearm: () => boolean;
  refresh: () => Promise<void>;
  schedule: (callback: () => void, delay: number) => () => void;
}) {
  let cancelTimer: (() => void) | undefined;
  let inFlight = false;
  let ended = false;
  let automaticAttemptAvailable = true;
  let generation = 0;

  const schedule = () => {
    const challenge = dependencies.currentChallenge();
    if (!ended || !automaticAttemptAvailable || cancelTimer || inFlight || !challenge || !dependencies.canRearm()) return;
    automaticAttemptAvailable = false;
    const attempt = generation;
    cancelTimer = dependencies.schedule(() => {
      if (attempt !== generation) return;
      cancelTimer = undefined;
      if (!dependencies.canRearm() || dependencies.currentChallenge() !== challenge) return;
      ended = false;
      inFlight = true;
      // A failed refresh must not spawn a retry chain or interrupt email sign-in.
      void dependencies.refresh().catch(() => {}).finally(() => {
        if (attempt === generation) inFlight = false;
      });
    }, 750);
  };

  return {
    diagnostic(event: PasskeyDiagnostic) {
      if (event.stage !== "authorization_error"
        || event.domain !== "com.apple.AuthenticationServices.AuthorizationError"
        || event.code !== 1001
        || !dependencies.canRearm() || cancelTimer || inFlight) return;
      // Swift emits this only for an ended, current authorization controller.
      // ASAuthorizationError.canceled (1001) is an intentional dismissal.
      // Generic failed/unknown/notHandled/invalidResponse outcomes are not
      // evidence of recoverability and must not cause automatic re-arming.
      ended = true;
      schedule();
    },
    interact() {
      // Called only by a user touch, never by native/programmatic focus events.
      if (cancelTimer || inFlight || !dependencies.canRearm()) return;
      automaticAttemptAvailable = true;
      schedule();
    },
    cancel() {
      generation += 1;
      cancelTimer?.();
      cancelTimer = undefined;
      inFlight = false;
      ended = false;
      // Cleanup does not replenish the retry budget; only interact() can.
    },
  };
}
