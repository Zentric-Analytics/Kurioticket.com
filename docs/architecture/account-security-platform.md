# Account Security Platform

Kurioticket uses one account policy across web and mobile. Authenticatable accounts must have an allowed status, verified email, and (in Preview) current tester access. `PENDING_DELETION` remains a deliberate recovery-only exception where the existing cancellation flow permits it.

## Assurance and sessions

Authentication method records how identity was proven (`PASSWORD`, `EMAIL_CODE`, `GOOGLE`, `PASSKEY`, or legacy `UNKNOWN`); authorization remains independently role/capability based. Assurance is `PRIMARY`, `MFA`, or `PHISHING_RESISTANT`. A verified passkey is phishing-resistant and satisfies account 2FA. Sensitive production operations use a ten-minute recent-reauthentication window.

`AccountSession` is the credential registry for both clients. Every row captures its issue-time `User.sessionVersion`; revocation, expiry, account policy, unfinished 2FA, and version mismatch fail closed. Global invalidation increments the user version and revokes all rows. Last-seen writes are throttled to approximately 60 seconds. Only masked IP and coarse user-agent-derived metadata may be retained.

NextAuth keeps its eight-hour JWT strategy. The JWT refers to the canonical web session; eligible legacy JWTs are adopted without inventing stronger assurance. Middleware can improve redirects, but **middleware is UX assistance, not authoritative database-backed session revocation**. Server guards enforce the registry on protected boundaries.

Mobile tokens are opaque `ktm1.<session-id>.<secret>` credentials with 256 bits of entropy. Only the secret hash is stored. Legacy raw `c.` and `g.` mobile rows are positively identified and deleted by the forward migration; unrelated adapter session rows remain. Mobile 2FA challenges are hashed, one-use, five-minute, and attempt bounded. SecureStore remains the native credential store, and logout attempts server revocation before local clearing.

## Events and notification policy

`SecurityEvent` is the durable security ledger, distinct from delivery/inbox `Notification`. Critical mutations persist their event in the state transaction where practical; notification/email delivery follows and cannot roll back the mutation. Notification integrations use deterministic keys of the form `security:event:<event-id>`. Critical password, 2FA, passkey, and global-sign-out notices are mandatory; `securityEmailAlerts` controls only informational sign-in/device email.

## Encryption rollout

New TOTP ciphertext uses versioned AES-256-GCM `v2` data and `ACCOUNT_SECURITY_ENCRYPTION_KEY` (at least 32 characters). Production setup fails closed without it. `ACCOUNT_SECURITY_LEGACY_ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, and `AUTH_SECRET` are read-only legacy candidates for v1 data. A successful v1 verification re-encrypts with v2. Development/test has an explicit non-production fallback; production never uses it. Never log these values or plaintext TOTP material.

Preview suspension, revocation, or expiry is checked at authoritative session validation. Production Feature Control capability remains separate from authentication assurance and additionally requires recent trusted reauthentication.
