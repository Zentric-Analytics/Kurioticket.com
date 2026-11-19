# Staging credential handling incident — November 16, 2026

## Current owner disposition

Owner explicitly decided not to rotate or change the staging database password and instructed continuation. Record the exposure as an **acknowledged, unresolved security risk**. This is not evidence of harmlessness, absence of access or remediation. The earlier rotation decision/hold below is superseded; resume authorized read-only readiness and prepare the separately approved recovery operation. Do not request the rotation decision again, change credentials or production main. No restore/access-change/spending authorization is implied.

## Observation and immediate containment

During authorized read-only recovery preparation, opening the source database Connect popover unexpectedly placed an unmasked staging connection credential in the browser tool's accessibility output. The connection menu was closed immediately. No credential value, connection URL or public hostname is reproduced in this document or the prepared local tooling. No credential was used outside its intended staging context, rotated, revoked, saved to an artifact, or transmitted through a database connection by this continuation. No database query occurred. This record does not claim third-party access, compromise or that the transcript exposure has been erased.

Affected source: staging PostgreSQL `dpg-dabi7k7qj5pc73a3the0-a`. Actual production was not accessed. Do not use the Connect popover again for metadata inspection; it renders a complete credential rather than a sanitized hostname.

The owner was notified without repeating the secret. Recovery remains on a security hold; no source allowlist modification, recovery creation or charge is authorized or has occurred.

## Proposed containment path — not execution authorization

Prefer coordinated replacement and retirement of the exposed staging credential. Before any write, finish the affected-consumer inventory and present a separate exact plan: new staging default credential, secure update of legitimate staging consumers, controlled application rollout, successful health/authentication verification, then retirement of only the exposed credential. No production credential, database schema, migration history, worker ledger or unrelated resource should change.

Known consumer evidence: staging web reads the original private DATABASE_URL in memory; staging currency cron calls the web endpoint rather than presenting a database connection in its displayed command. Preview worker uses its separate release ledger according to the handoff, but no current secret-bearing environment inspection was performed. Unknown external clients are not proven absent and credential rotation can interrupt them beyond a temporary network restriction.

Credential replacement can require a staging configuration/deployment change; do not silently include that in restore approval. The currently live old web SHA is not the stabilized candidate; a rebuild of old dependencies can fail security checks. Do not bypass those checks or assume restart adopts newly saved environment values. A safe artifact/configuration rollout and rollback must be resolved before credential execution approval. Revoking a credential cannot be undone by restoring the exposed secret; new credentials and a controlled forward repair may be required.

No additional paid infrastructure is proposed. Any build-pipeline charge or other incremental cost must be disclosed and approved separately; the $1 recovery cap is not generic deployment/credential-change spending authority. Maintain worker suspension throughout.

Owner decision needed: prioritize coordinated credential replacement before recovery, or explicitly disposition the transcript exposure and permit finishing recovery readiness without changing credentials. Neither decision by itself authorizes credential writes, deployment, source access changes or PITR. Do not request final restore execution authorization while this security hold is unresolved.
