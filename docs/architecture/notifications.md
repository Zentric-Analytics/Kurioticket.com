# Notification architecture

Kurioticket records one canonical `Notification` row for each meaningful user event. New events require a deterministic `eventKey`; the database unique index is the retry and concurrency boundary. The legacy `channel` column remains temporarily for migration compatibility and defaults to `IN_APP`. It does not represent email delivery for new events.

The native Android/iOS Notification Center reads canonical events through authenticated, user-scoped mobile APIs. Actions are restricted to an allowlist of Kurioticket-internal mobile routes. There is no website Notification Center, browser notification implementation, device push-token registration, APNs, FCM, or Expo push integration.

Email delivery continues through the existing Resend and `EmailDelivery` infrastructure. Price alert, route watch, saved-trip reminder, travel inspiration, product update, and deals email remains optional and preference/suppression controlled. Material account, security, and support communication is transactional. Email success never determines whether the underlying travel or account event occurred.

Current canonical event types are price alerts, route-watch fare drops, trip reminders, support updates, account updates, security updates, important system events, and the legacy travel-insight type. Producers derive keys from stable domain transitions (alert ID/state, route-watch observation, saved item/window/anchor, support message ID, or account before/after transition), never from the current clock alone.

Material account/security integrations cover password changes and completed resets, passkey addition/removal, 2FA enable/disable/recovery-code regeneration, verified email-address changes, phone changes, and the account-deletion request/cancellation/review/completion lifecycle. These emails are transactional and bypass optional-email preferences. Operation emails used to perform authentication (verification codes, login codes, reset links, and passkey reauthentication codes) remain separate and do not create inbox events.

The current session-management endpoints only mark session-activity records as revoked and explicitly report `record-only`; they do not revoke authentication sessions. They intentionally do not create security notifications because doing so would misleadingly imply account access had been terminated. Ordinary sign-in, session creation, heartbeat activity, passkey rename, initial email verification, and reading security settings are also not notification events.

Security notification content never includes passwords, reset tokens, WebAuthn challenges, credential IDs/public keys, TOTP secrets, QR/setup data, recovery codes, full device details, or IP addresses. Email-change notification to the previous address does not disclose the new address.

Deploy `20260809120000_canonical_notification_events` through the normal Prisma migration workflow before application rollout. Legacy rows intentionally retain a nullable event key; no speculative backfill is required.
