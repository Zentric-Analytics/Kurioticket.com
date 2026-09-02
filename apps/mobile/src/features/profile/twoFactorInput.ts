export function normalizeAuthenticatorCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function formatRecoveryCodesForClipboard(codes: readonly string[]) {
  return codes.join("\n");
}
