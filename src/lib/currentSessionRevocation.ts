export async function revokeCurrentAccountSession() {
  try {
    await fetch("/api/account/security/sessions/current/revoke", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // Sign-out should continue even if server revocation cannot be reached.
  }
}
