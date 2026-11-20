# Kurioticket staging database interruption and web recovery — 2026-11-20

## Scope and verified impact

- Staging web: `srv-dabmo50jo6nc73881d60` (Oregon, one web instance).
- Staging PostgreSQL: `dpg-dabi7k7qj5pc73a3the0-a` (Oregon, 256 MB plan, HA disabled).
- At 11:23:43 UTC the admin customer Activity reader logged a terminated connection.
- At 11:23:49–11:23:51 UTC PostgreSQL logged interrupted startup, automatic recovery and then readiness.
- At 11:26:37 UTC the Render service event explicitly reported `server_failed` because its HTTP health check returned **503**.
- Similar PostgreSQL recovery and Render health-check failures occurred at 10:31, 10:42, 10:48 and 10:56 UTC. These are not limited to the Users page.
- A read-only `pg_stat_activity` query at 11:39 UTC returned 11 sessions (1 active) and `max_connections=103`. Sampled DB memory usage was below the available 256 MB limit. Neither connection exhaustion nor memory exhaustion is established as the underlying cause.

The original `/api/health` returns HTTP 503 when PostgreSQL is unavailable. Render used that strict readiness route as the web instance's liveness check. Therefore DB interruptions cascaded into web instance restarts and site-wide gateway errors. This is **a verified restart mechanism**, not proof of why PostgreSQL was interrupted.

## Code remediation (this PR)

1. `/api/health/live`: database-independent, uncached HTTP 200 only while the Next.js HTTP application can serve requests.
2. `/api/health`: **unchanged strict database readiness**; continues to return HTTP 503 during a DB outage. Never replace readiness monitoring with liveness monitoring.
3. `render.yaml` staging healthCheckPath uses `/api/health/live`. The production Blueprint health path is untouched.
4. Admin customer Activity errors provide a retry that preserves the exact identity and filters and disables repeated clicks during a refresh. When the Activity reader reports unavailable, the page avoids a second management query against an unreachable DB.
5. Authentication, guest consent boundaries, account management permissions and activity storage are unchanged.

## Required rollout (not automatic)

**Do not switch the live Render health check until this PR is built and the new endpoint is deployed on staging.** The staging service has manual deployments and may not be Blueprint-managed. Changing `render.yaml` alone does not establish that Render applied the setting.

1. Run the required PR gates, liveness contract tests and Admin activity visual QA.
2. Deploy the verified staging build using the existing approved release workflow.
3. Check `GET https://staging.kurioticket.com/api/health/live`: HTTP 200 with `check=liveness`, even if DB readiness is temporarily unavailable. No credentials required.
4. Check `GET https://staging.kurioticket.com/api/health`: HTTP 200 and connected=true while the database is healthy. During a confirmed DB outage, it must still return HTTP 503.
5. In Render Dashboard → Kurioticket-web-staging → Settings, set the **Health Check Path** to `/api/health/live` and save. Verify it with `get_service`; leave production unchanged.
6. Independently monitor `/api/health` (for DB readiness), application error logs and Render events. Do not treat HTTP 200 liveness as proof that customers can sign in, search or load history.
7. Test Users Directory → registered user → View Activity → Retry, then one guest and an intentionally unavailable-history scenario. Verify exact identity/filters and no unauthorized records.

## Unresolved: PostgreSQL process interruptions

Open a **Render support incident** with the observed UTC windows and database ID. Ask for an investigation of PostgreSQL postmaster interruptions / unexpected process exits, host/instance evictions, disk and runtime health and the absence of high availability. Provide associated application `Connection terminated unexpectedly` times and the web `server_failed: HTTP health check 503` events. Do not send database credentials, user details or raw customer records.

Consider a larger Postgres plan or high availability **only after** reviewing diagnosis, cost, downtime and rollback expectations. No plan, credentials, database records or schema were changed by this PR.

## Acceptance / limitations

- Render does not recycle the sole staging web instance solely because PostgreSQL readiness becomes 503.
- The staging web process continues accepting HTTP requests through a transient DB interruption, but DB-backed actions may still return a controlled unavailable response and may require reauthentication if session validation fails.
- PostgreSQL must be separately stabilized. Liveness decoupling alone **cannot** prevent all 502s, failed authentication or lost DB availability.
- No assumption that the missing user Activity records were deleted; verify once DB is stable.
