export async function revokeCurrentSessionRecord() {
  try {
    await fetch("/api/account/security/sessions/current/revoke", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // Sign-out should continue even if record-only revocation cannot be reached.
  }
}
