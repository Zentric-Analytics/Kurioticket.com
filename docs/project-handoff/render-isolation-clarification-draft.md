# Unsent Render support clarification draft

Owner response to the sending approval request: **option2, keep unsent**. No message submitted. Preserve finalized text for possible future explicit approval; do not send under the preparation authorization.

Finalized for owner approval November16,2026. Recipient: Render Support through the authenticated Render Dashboard support channel. Proposed disclosure: staging resource ID `dpg-dabi7k7qj5pc73a3the0-a`, PostgreSQL version/region, test timing and sanitized protocol outcomes. No credentials, public hostname, connection URL, customer/business data or raw log attachments. No request to change infrastructure or incur cost. **Not approved or sent.**

Subject: Authoritative verification of Postgres external-IP denial before isolated PITR

---

For staging Postgres `dpg-dabi7k7qj5pc73a3the0-a` (PostgreSQL18, Oregon), we need a credential-free, authoritative way to verify effective external IP denial before an isolated PITR test.

On November16 at approximately09:07UTC, we temporarily saved an empty database-specific external allowlist. A seven-second TLS/SNI PostgreSQL startup probe timed out; because that was inconclusive, we aborted without submitting PITR and restored the exact original rules. Staging health passed. No recovery database was created.

Later allowed-state checks using a phase-aware probe and an independent installed pg/pg-protocol client each reached a PostgreSQL authentication challenge over certificate-verified TLS in about0.6seconds. Neither sent a password, authentication reply or SQL. The original restricted-state probe did not record its failing phase, so we cannot attribute that timeout to your IP policy.

Your inbound-IP documentation describes post-TCP protocol enforcement and a generic HTTP403 response. Please confirm the authoritative behavior for **Postgres**, specifically:

1. Are disallowed clients rejected during SSLRequest, TLS/SNI or PostgreSQL StartupMessage? Are **silent drops/timeouts** expected, or should clients receive a TLS alert, EOF/reset or specific PostgreSQL ErrorResponse/SQLSTATE?
2. What is the propagation bound, and are existing external connections affected?
3. If denial is silent, what supported resource-bound policy evaluation, denial log, audit event or API lets an independent external verifier distinguish enforced IP denial from unrelated network loss without credentials or SQL?
4. When are source IP restrictions inherited by a PITR copy, and what is the supported way to independently verify the copy's effective denial before restoring source access?

We will not treat timeout, TCP connectivity or a Dashboard rule alone as isolation proof. Please recommend a bounded verification procedure and explicit acceptance criteria. This is a technical clarification only; please do not make resource, credential, configuration or paid-service changes.

---

Earlier working draft retained below for continuity; send **only the finalized subject/body above** if approved.

Preparation only. Do not send without explicit owner authorization. No credential, hostname, URL, customer record or raw log is included.

We are preparing an isolated staging Postgres PITR test with the source's DB-specific external allowlist temporarily empty. Source is PostgreSQL18 in Oregon; private app connectivity must remain usable. We have not retried the recovery after a safety-check failure, and original access is restored.

Your inbound-IP documentation says enforcement follows TCP establishment at protocol request time, but its generic HTTP403 statement does not define the Postgres wire response. We need to distinguish a policy-enforced block from an unrelated network failure using credential-free TLS/SNI startup.

Please clarify:

1. For a disallowed public client, at which phase is a Postgres connection denied: SSLRequest, SNI/TLS handshake, PostgreSQL StartupMessage, or another phase?
2. Is the expected observable result a specific PostgreSQL ErrorResponse/SQLSTATE/message category, TLS alert, EOF/reset, silent drop/timeout or another response? Is a denial signature authenticated by the datastore's TLS certificate?
3. What propagation bound applies to empty DB rules, and are existing connections affected?
4. Is there a supported resource-bound audit/log/API mechanism that confirms a particular external Postgres startup was denied by IP rules without a password or SQL? Can it be correlated safely without publishing private client addresses or credentials?
5. At what point are source allowlist settings inherited by a PITR copy, and how can the new copy's effective external-deny state be independently verified before restoring the source's original rules?

Our seven-second restricted-state probe returned an unphased timeout; that is not claimed as denial proof. Later allowed-state diagnostic and independent installed pg-protocol clients both obtained authentication challenges over verified TLS in about0.6s without sending authentication replies. We need a supported fail-closed acceptance standard before proposing another restricted-state test. No secret/data access or paid diagnostic infrastructure is requested.
