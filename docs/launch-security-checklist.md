# Launch security checklist

## Secrets

- Provider, database, authentication, email, cron, and encryption credentials remain server-side.
- No provider credential appears in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` values.
- Staging and production credentials are isolated.
- Logs contain no authorization headers, database URLs, provider payloads, or traveler details.
- `npm run security:secrets` passes.

## Travel architecture

- Duffel is the only flight provider.
- Kurioticket's static hotel catalogue is the only current hotel source and exposes no external booking.
- Cars use the server-owned static catalogue without external checkout.
- Deals compose those same pipelines.
- Provider failures never create fabricated inventory.

## Deployment

- Staging deploys `dev`; production deploys `main`.
- Build, start, migration, cron, and health-check commands are verified.
- Database migrations are reviewed for locking, data loss, and rollback impact.
- Required provider searches pass in staging before production promotion.
- Rollback deployment and environment-variable presence records are available.
