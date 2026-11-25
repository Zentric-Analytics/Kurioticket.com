# Essential recording boundary — phase 2, initial writer separation

## Purpose

A customer who declines optional analytics must still be able to search, continue to a provider, sign in, save an item, manage price alerts and submit support. Account identity does not substitute for analytics consent.

## New recording paths

- Search and provider diagnostics are imported through `operationalActivityService`. Existing `SearchHistory` and `ApiProviderLog` storage, timing, and result semantics are unchanged.
- `RedirectLog` remains the independent source of a verified provider handoff. Do not invoke the optional event/journey writer without a visitor.
- `operationalAccountAuditService` records only allowlisted confirmed account mutations. It reconstructs the metadata, does not attach a visitor, and assigns `recordPurpose: essential_account_audit`. Confirmed saves/removals keep their existing atomic transaction; signup, alerts and registered support keep best-effort history. Guest support is already recorded by SupportTicket and needs no duplicate account audit.
- The legacy search/redirect analytics writer now requires a consented visitor at entry and revalidates consent and ownership inside its transaction. When absent, invalid or withdrawn, no optional row is written. Page and interaction writers already enforce consent and new rows carry `recordPurpose: optional_analytics`.

## Compatibility and follow-up boundaries

The existing physical AnalyticsEvent table is intentionally retained for account-audit records so historical data, account deletion handling, Admin labels, and existing save/price-alert journey references remain compatible. No schema migration or historic deletion/backfill is part of this PR. Purpose markers label new records, not historical records. The current consent-gated save/alert journey enrichment still links the legacy audit row; splitting that linkage and the Admin read classifications is a separate dependent change. This PR is not full Essential certification. Search-to-handoff client correlation, presence/status semantics, IP/retention, historical withdrawal visibility and installed-device verification are subsequent tasks. Do not use a purpose marker alone as authorization or proof of consent.

## Verification

Exercise guest and authenticated searches and handoffs with absent, granted and withdrawn consent; confirm operational rows remain while optional writes require a valid locked visitor. Verify account save/unsave idempotency and rollback, confirmed price-alert audit history, signup, support and existing journey behavior. Existing integration tests run only against their disposable local database. Do not test against production/customer data. Full PR gates and staging device verification must pass before merging or declaring the broader separation complete.
