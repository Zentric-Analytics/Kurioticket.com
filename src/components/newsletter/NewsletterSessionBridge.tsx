"use client";

/**
 * Homepage newsletter personalization is intentionally disabled.
 *
 * The public landing page must not wait on account, security, passkey, or
 * session lookups. A previous session bridge used useSession plus DOM
 * polling/mutation to prefill the newsletter form for signed-in users; on the
 * homepage that created a MutationObserver feedback loop and an unnecessary
 * /api/auth/session request. Keeping this component as a no-op preserves the
 * layout integration point without running homepage-only account work.
 */
export function NewsletterSessionBridge() {
  return null;
}
