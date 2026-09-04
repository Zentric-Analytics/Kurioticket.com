export type NativePasskeyCreationCategory =
  | "RP_ID_VALIDATION"
  | "APP_ASSOCIATION"
  | "PROVIDER_UNAVAILABLE"
  | "ALREADY_EXISTS"
  | "USER_CANCELLED"
  | "UNKNOWN_NATIVE";

export type NativePasskeyCreationDiagnostic = {
  category: NativePasskeyCreationCategory;
  safeNativeCode?: string;
};

const MAX_INSPECTED_FIELD_LENGTH = 1000;
const MAX_SAFE_CODE_LENGTH = 40;

function diagnosticField(error: unknown, key: "error" | "name" | "code" | "message"): string {
  if (!error || typeof error !== "object") return "";
  let field: unknown;
  try {
    field = (error as Record<string, unknown>)[key];
  } catch {
    return "";
  }
  if (typeof field !== "string" && typeof field !== "number") return "";
  return String(field).slice(0, MAX_INSPECTED_FIELD_LENGTH);
}

function safeNativeCode(value: string): string | undefined {
  const code = value.trim();
  return code.length > 0
    && code.length <= MAX_SAFE_CODE_LENGTH
    && /^[A-Za-z0-9._-]+$/.test(code)
    ? code
    : undefined;
}

export function normalizeNativePasskeyCreationError(error: unknown): NativePasskeyCreationDiagnostic {
  const nativeCode = safeNativeCode(diagnosticField(error, "code"));
  const text = (["error", "name", "code", "message"] as const)
    .map((key) => diagnosticField(error, key))
    .join(" ")
    .toLowerCase();
  const compact = text.replace(/[^a-z0-9]/g, "");

  if (compact.includes("usercancelled")
    || text.includes("user canceled")
    || text.includes("user cancelled")
    || compact.includes("createcredentialcancellationexception")
    || compact.includes("aborterror")) {
    return { category: "USER_CANCELLED", ...(nativeCode ? { safeNativeCode: nativeCode } : {}) };
  }
  if (text.includes("50152")
    || text.includes("rp id cannot be validated")
    || text.includes("rp id validation")
    || text.includes("relying party id") && text.includes("validat")
    || compact.includes("rpiddomainvalidation")) {
    return { category: "RP_ID_VALIDATION", ...(nativeCode ? { safeNativeCode: nativeCode } : {}) };
  }
  if (text.includes("asset link")
    || text.includes("app-to-website")
    || text.includes("app to website")
    || text.includes("digital asset")
    || text.includes("package") && text.includes("certificate") && text.includes("association")
    || text.includes("app association")) {
    return { category: "APP_ASSOCIATION", ...(nativeCode ? { safeNativeCode: nativeCode } : {}) };
  }
  if (compact.includes("notconfigured")
    || compact.includes("providerconfiguration")
    || text.includes("provider unavailable")
    || text.includes("no credential provider")
    || compact.includes("createcredentialunsupportedexception")
    || compact.includes("notsupported")) {
    return { category: "PROVIDER_UNAVAILABLE", ...(nativeCode ? { safeNativeCode: nativeCode } : {}) };
  }
  if (compact.includes("invalidstateerror")
    || text.includes("already exists")
    || text.includes("already registered")
    || compact.includes("excludecredentials")
    || compact.includes("credentialalreadyexists")) {
    return { category: "ALREADY_EXISTS", ...(nativeCode ? { safeNativeCode: nativeCode } : {}) };
  }
  return { category: "UNKNOWN_NATIVE", ...(nativeCode ? { safeNativeCode: nativeCode } : {}) };
}

