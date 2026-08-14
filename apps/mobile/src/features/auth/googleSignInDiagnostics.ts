export type GoogleSignInOperation =
  | "configure"
  | "checkPlayServices"
  | "signIn"
  | "createAccount"
  | "presentExplicitSignIn";

const GENERIC_GOOGLE_ERROR = "Google sign-in could not be completed. Please try again.";
const SAFE_LABEL = /[^A-Za-z0-9._:-]/g;
const AUTHORIZATION = /\bauthorization\b\s*[:=]?\s*(?:bearer\s+)?[^\s,;]+/gi;
const SENSITIVE_VALUE = /\b(?:id[_-]?token|access[_-]?token|session[_-]?token|bearer|user[_ -]?id|profile[_ -]?id)\b\s*[:=]?\s*[^\s,;]+/gi;
const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const OPAQUE_IDENTIFIER = /\b(?:[0-9a-f]{8}-[0-9a-f-]{27,}|[A-Za-z0-9_-]{24,})\b/gi;
const URL = /https?:\/\/\S+/gi;

function safeLabel(value: unknown, fallback: string) {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  return String(value).trim().replace(SAFE_LABEL, "").slice(0, 64) || fallback;
}

function safeMessage(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(AUTHORIZATION, "[redacted]")
    .replace(SENSITIVE_VALUE, "[redacted]")
    .replace(EMAIL_ADDRESS, "[redacted]")
    .replace(JWT, "[redacted]")
    .replace(OPAQUE_IDENTIFIER, "[redacted]")
    .replace(URL, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function field(error: unknown, name: "code" | "name" | "domain" | "message") {
  return typeof error === "object" && error && name in error
    ? (error as Record<string, unknown>)[name]
    : undefined;
}

export function getNativeGoogleErrorCode(error: unknown) {
  return safeLabel(field(error, "code"), "unknown");
}

export function formatNativeGoogleError(input: {
  error: unknown;
  isPreview: boolean;
  operation: GoogleSignInOperation;
  platform: string;
}) {
  if (!input.isPreview) return GENERIC_GOOGLE_ERROR;

  const platform = safeLabel(input.platform, "unknown");
  const code = getNativeGoogleErrorCode(input.error);
  const name = safeLabel(field(input.error, "name"), "");
  const domain = safeLabel(field(input.error, "domain"), "");
  const message = safeMessage(field(input.error, "message"));
  const metadata = [
    input.operation,
    `code=${code}`,
    name ? `name=${name}` : "",
    domain ? `domain=${domain}` : "",
  ].filter(Boolean).join("; ");

  return `Google sign-in failed (${platform}: ${metadata})${message ? ` — ${message}` : ""}`;
}

export { GENERIC_GOOGLE_ERROR };
