# Account deletion backend lifecycle

The account deletion backend has four lifecycle states: `PENDING`, `CANCELLED`, `READY_FOR_REVIEW`, and `COMPLETED`.

## Grace period

A request starts in `PENDING` and immediately revokes active account sessions. Self-service reactivation is permitted only while the seven-day deadline is still in the future.

Reactivation and finalization take the same account lifecycle lock and then lock the deletion request row. They cannot both commit for the same request.

Expired `PENDING` requests are promoted by:

`POST /api/internal/cron/account-deletion-review`

The request requires `Authorization: Bearer <ACCOUNT_DELETION_CRON_SECRET>`. It is idempotent and only advances eligible non-admin requests.

The code and secret contract do not automatically create another paid Render cron service. Provisioning that schedule is an infrastructure/cost decision after deployment.

## Finalization

The admin mutation supports a backend-only `finalize` action. It requires:

- request status `READY_FOR_REVIEW`;
- an expired grace period;
- a non-admin, non-protected account still in the deletion lifecycle;
- `retentionReviewed: true`;
- non-empty review notes;
- a non-empty admin/case reference;
- exact account-email confirmation.

The legacy `mark_completed` action no longer marks a request complete by itself. It returns a conflict and requires the explicit finalization contract.

A successful finalization atomically:

- turns the User row into a non-login `DELETED` tombstone because the retained deletion request has an `ON DELETE RESTRICT` relation;
- clears direct account identity/login fields;
- removes profile, preferences, sessions, passkeys, auth accounts, saved travel, alerts, notifications, and trips;
- retires linked analytics visitor identities and consent;
- detaches retained search, handoff, analytics, and support rows from the User;
- redacts support/deletion-request email snapshots;
- unsubscribes and anonymizes a newsletter subscriber matching the account email;
- removes transient verification tokens tied to the account email or user id;
- preserves independently retained delivery, support-message, audit, and operational ledgers for the retention review to govern;
- marks the request `COMPLETED` only after all destructive mutations succeed in the same transaction.

## Existing manual hard-delete endpoint

`DELETE /api/admin/users/[id]/permanent` remains available for already-soft-deleted accounts that do not have an account-deletion request. Accounts with any deletion request are rejected there and must use the audited finalization flow.
