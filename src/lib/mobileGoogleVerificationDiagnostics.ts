import { isStagingEnvironment } from "./stagingSafety";

export type GoogleVerifyErrorClass =
  | "audience"
  | "issuer"
  | "signature"
  | "expired"
  | "malformed"
  | "certificate"
  | "unknown";

type VerifiedClaimChecks = {
  subjectPresent: boolean;
  emailPresent: boolean;
  emailVerified: boolean;
  noncePresent: boolean;
  nonceMatches: boolean;
};

const DIAGNOSTIC_PREFIX = "[mobile-google-verification]";

export function classifyGoogleVerifyError(error: unknown): GoogleVerifyErrorClass {
  if (!(error instanceof Error)) return "unknown";

  const message = error.message.toLowerCase();
  if (/audience|wrong recipient/.test(message)) return "audience";
  if (/issuer/.test(message)) return "issuer";
  if (/signature/.test(message)) return "signature";
  if (/expired|used too late|token used too late/.test(message)) return "expired";
  if (/malformed|jwt must|wrong number of segments/.test(message)) return "malformed";
  if (/certificate|certs|no pem|public key/.test(message)) return "certificate";
  return "unknown";
}

export function logMobileGoogleVerificationRejected(error: unknown) {
  if (!isStagingEnvironment()) return;

  console.warn(DIAGNOSTIC_PREFIX, {
    event: "mobile_google_verification_rejected",
    stage: "verifyIdToken",
    verified: false,
    verifyErrorClass: classifyGoogleVerifyError(error),
  });
}

export function logMobileGoogleClaimsRejected(checks: VerifiedClaimChecks) {
  if (!isStagingEnvironment()) return;

  console.warn(DIAGNOSTIC_PREFIX, {
    event: "mobile_google_claims_rejected",
    stage: "verifiedClaims",
    verified: true,
    ...checks,
  });
}

export function logMobileGoogleVerificationPassed() {
  if (!isStagingEnvironment()) return;

  console.warn(DIAGNOSTIC_PREFIX, {
    event: "mobile_google_verification_passed",
    verified: true,
    claimsAccepted: true,
  });
}
