# Portable evidence and sanitization

This directory contains curated, credential-free evidence. It is sufficient for project continuation, not a byte-for-byte backup of every local audit artifact.

- `validation-summary.json`: final recorded totals and exit results for the engineering baseline, not newly executed tests.
- `suite-tails.txt`: sanitized final counters extracted from original web/native logs; no test fixture bodies, record output or connection settings.
- `private-preflight.json`: completed read-only private preflight result without account, host, connection URL or credentials.
- `source-manifest.json`: relative original report/log names, byte sizes and SHA256 hashes. Hashes identify original artifacts; they do not make unpublished raw content recoverable from GitHub.

Completed work is summarized across the linked handoff documents. The final November14 engineering report is the source for final totals; November15 browser readiness supersedes older unavailable-browser and running-worker observations. Conversation decisions supersede approval packets that still said approval was pending.

## Material deliberately excluded

Raw full logs, database query transcripts, browser screenshots, machine-specific paths, account contact addresses, dynamic public IPs, database hostnames/connection URLs, credentials/tokens, customer/business records, generated bundles/source maps, dependency directories, browser profiles/cookies and unsanitized operational dumps are NOT copied. No credential values are necessary to continue.

Original `outputs/` reports and `work/final-blocker-resolution/` logs remain intact on the first computer, outside Git. They still need an approved secure off-device backup if exact originals must survive a machine reset. Do not upload those folders wholesale to GitHub. Source hashes and sanitized excerpts are portable; raw logs are not included by design.

The source manifest covers original named reports and selected validation records reviewed during handoff preparation. It is not a completeness assertion about every historical temporary file or all worktrees. No new tests, database connection, restore or live acceptance occurred to create this documentation.
