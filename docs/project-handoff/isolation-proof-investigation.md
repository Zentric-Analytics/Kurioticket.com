# Recovery isolation-proof investigation

November 16, 2026, approximately 05:45 PST. Read-only investigation; **no allowlist changes, PITR, paid resource, credentials, remote push, worker operation or deployment**. Existing engineering HEAD remains `74a65ca5aa17fc2b51ddbf25f2299958d2a874b8`; no production/main operation.

## Finding

**The exact cause of the original network timeout is not established.** The original evidence records only `timeout_inconclusive`; it cannot identify whether DNS/TCP, the SSL response, TLS handshake, PostgreSQL startup response or a clean connection close caused the wait. Do not retrospectively label it proven network denial, a Render fault, or a confirmed coding cause of that particular attempt.

A real probe classification defect **is established and locally reproduced**: the original registers TLS `error` but no TLS `end`/`close` handler. Its underlying socket close handler deliberately does nothing once a TLS object exists. A clean post-startup TLS close therefore waits until the global seven-second timer and returns `timeout_inconclusive`. A mocked-network regression using the unmodified original returned that exact result in 7,002.85 ms. No live connection was used in that reproduction.

Other limitations: no phase or per-stage timing, no safe error codes, no distinction between DNS/network/TLS/backend silence, no independent contemporaneous client control, and only one assumed successful-denial signature (`28000` plus `no pg_hba.conf entry for host`). Seven seconds was an operational bound, not a documented provider denial response time. The older successful public probe in the handoff was not a contemporaneous same-path control for the failed attempt.

## What Render and PostgreSQL actually document

Render's [inbound-IP rules](https://render.com/docs/inbound-ip-rules.md) state that enforcement occurs after initial TCP establishment when a protocol-level request arrives, and a socket-only test is insufficient. Empty rules block inbound traffic and rule changes take effect within a few seconds. The general page mentions HTTP `403 Forbidden`, but does **not specify an exact PostgreSQL wire error, SQLSTATE, TLS phase, EOF/reset pattern or timeout contract**. Do not interpret the HTTP sentence as a guaranteed PostgreSQL `pg_hba` ErrorResponse. The [Postgres connection reference](https://render.com/docs/postgresql-creating-connecting.md) confirms the restriction is external-only and same-region private connections bypass it. Neither page establishes that a timeout proves effective denial.

The [PostgreSQL SSL protocol](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-SSL) is TCP -> SSLRequest -> one-byte S/N -> TLS handshake -> StartupMessage -> authentication/error. A pre-TLS error is unauthenticated and must not be promoted to trustworthy server identity/denial evidence. The [pg_isready reference](https://www.postgresql.org/docs/current/app-pg-isready.html) distinguishes accepting, rejecting, and no-response exit states; its no-response result is not ACL proof, and even its generic rejecting state can indicate startup rather than an access rule.

Therefore neither PostgreSQL rejection nor timeout can be asserted as Render's guaranteed datastore-denial response from these sources. Explicit rejection, silent drop, termination, propagation timing or another transport outcome remain possible explanations, not established facts about this event.

## New bounded read-only observations on the restored endpoint

These checks are justified by the specific missing-phase/independent-parser investigation. They are not application test reruns or the private-network preflight. They sent no password, authentication reply or SQL; dummy user/database values were used. They may create ordinary connection-startup log entries. No secret environment values were read.

| Observation | UTC | Result |
|---|---|---|
| Phase-aware custom client | 2026-11-16T13:41:43.242Z | DNS resolved; TCP connected; SSL S received; certificate-verified TLS completed; StartupMessage sent; AuthenticationRequest received, 594 ms |
| Independent installed `pg.Connection` 8.20.0 framing/parser | 2026-11-16T13:42:48.163Z | TCP/TLS completed; authenticationMD5Password request received; no response sent, 607 ms |

Both used the existing workstation and original restored public endpoint. The second uses the already-installed pg/pg-protocol implementation rather than the custom frame parser. This is independent **implementation** evidence, not a second network vantage or successful database authentication. A real password was never used. PostgreSQL client tools `psql`/`pg_isready` were not on PATH; none was installed. No resource/service was created or repurposed.

These positive observations show that the current restored path and both clients function. They occurred more than four hours after the failed restriction probe, so they cannot prove that the earlier network path was healthy or establish causality for the original timeout.

## Prepared diagnostics and validation

Original external-denial.cjs and original result remain intact. New external-diagnostic.cjs reports safe phase flags, bounded byte counts, elapsed time, recognized error codes and sanitized PostgreSQL categories. It handles TCP/TLS end/close and retains certificate verification/SNI. It treats unauthenticated pre-TLS errors as inconclusive. No raw packets, certificate contents, addresses, credentials or server error text are persisted.

New tests: four focused mocked diagnostic cases passed (clean TLS close, authentication request without reply, exact timeout phase, DNS error); one additional regression reproduced the original clean-close misclassification. This is new operational tooling validation, not repeated engineering coverage. The independent pg client is version-guarded to the reviewed installed 8.20.0 and deliberately never constructs a password-handling Client. No further live probe or resource mutation was performed.

## Acceptable independent external verification method

Use the reviewed independent pg/pg-protocol parser from the approved external workstation, with exact resource/host guard, verified TLS identity, dummy startup identity, no authentication reply and <=7 seconds per attempt. Pair it with phase-aware diagnostics and an authenticated control-plane read of the exact resource's effective empty DB rules. Before a future authorized restriction, require a fresh allowed-state authentication challenge from this same current client/vantage; an ancient or other-computer positive is not sufficient. This new positive control would be justified by the original missing control, not a repeat of the private preflight.

**Definitive PASS for external denial:** certificate-authenticated, resource-bound response explicitly identifying network/host policy rejection, parsed independently and matching a provider-confirmed PostgreSQL denial signature. A `pg_hba` host-denial ErrorResponse can support this if emitted over verified TLS; a generic authentication failure or dummy-user rejection cannot. No need for a password or SQL.

**FAIL:** any authentication challenge/ReadyForQuery under deny-all (external protocol path remains reachable), a mismatched identity/host, wrong resource/rules, or unhealthy private staging.

**INCONCLUSIVE / rollback:** timeout in any phase, DNS/TLS failure, EOF/reset, generic error, unauthenticated rejection, contradictory control results, missing independent observation or elapsed deadline. EOF/reset can only become a supported denial criterion if Render confirms its exact behavior and an explicitly reviewed multi-signal standard is approved; do not silently relabel it PASS. Two clients timing out on the same path are still inconclusive, not independent proof of an ACL cause.

A second independent external network vantage can strengthen evidence if an existing approved workstation/operator is available, but no second approved vantage is established here. Do not create paid resources, use third-party connection-test sites, share credentials, add an IP exception or repurpose a live service. Packet traces would require careful sanitization and do not by themselves attribute a silent drop to Render's ACL.

## Revised recovery proposal status

**Not execution-ready; no new recovery authorization requested.** The improved clients and positive control are supported, but the provider-specific negative signature is not. A fail-closed diagnostic acceptance contract is prepared above; presenting it as a proven recovery method would overstate the evidence.

Next prerequisite is Render's explicit PostgreSQL rejection/termination semantics or a provider-backed effective-denial verification mechanism for this datastore. A credential-free support clarification draft is prepared separately and has **not been sent**, consistent with the read-only instruction. A service log, Dashboard deny-all display or a timeout alone is not being substituted for the missing external proof.

After that prerequisite is supported, prepare a new concrete bounded recovery proposal: fresh independent allowed-state control; new explicit authorization; T0/+20/+30 deadlines; exact source-only deny-all; independent denied-state checks; stop/restore before creating anything if unresolved; one isolated copy within $1/24h; independent copy containment; restore source exact rule; read-only copy evidence and prompt approved cleanup. The prior authorization remains terminated. No network change, restore, retry, credential change, worker resumption or deployment is implied by this investigation.
