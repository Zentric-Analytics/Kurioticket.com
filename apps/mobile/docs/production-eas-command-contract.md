# Production EAS CLI contract

The protected Android Production workflow pins `eas-cli@16.17.4`. All commands authenticate with the `mobile-production` environment token and resolve EAS project `89f6fd88-c0d7-495a-9e2b-8301b09f407d` from the checked-out app configuration.

| Purpose | Supported command | Structured stdout | Failure behavior |
| --- | --- | --- | --- |
| Remote version | `eas build:version:get --platform android --profile production --json --non-interactive` | `{}` when uninitialized; otherwise `{"versionCode":"N"}` | Diagnostics go to stderr; auth, project, network, service, empty, malformed, or extra-field output fails closed. |
| Existing builds | `eas build:list --platform android --build-profile production --app-identifier com.kurioticket.app --limit 1 --json --non-interactive` | JSON array (limit is capped at 50 by this CLI) | Nonzero exit or malformed/mismatched build identity fails closed. |
| Baseline lookup | `eas build:view <uuid> --json` | One build object | `build:view` does not support `--non-interactive`; nonzero or incomplete identity/status evidence fails closed. |
| Channel lookup | `eas channel:view production --json --non-interactive` | `currentPage` channel object with encoded branch mapping | Paused, rollout, multiple, missing, malformed, or non-Production mappings fail closed. |
| Build | `eas build --platform android --profile production --non-interactive --freeze-credentials --json` | A one-element build array after the CLI's default wait completes | `pipefail` preserves submission/poll/build failures. The result must be `FINISHED`, Android, Production identity/source/versionCode, and contain an HTTPS `.aab` artifact. |
| Production OTA | `eas update --channel production --platform android --message <reviewed reason> --non-interactive --json` | A one-element Android update array | The result must match the Production branch, runtime, and approved Git SHA. No submit command is present. |

`--json` redirects informational lines, ANSI status output, and CLI update notices away from stdout. Parsers never derive state from stderr. `EAS_NO_VCS` is forbidden so a successful build must record the exact approved main commit.

Credential resolution has no supported read-only, non-interactive command in this CLI version. The dry run therefore checks reviewed non-secret credential evidence plus the exact `--freeze-credentials` command contract. The real build remains the authoritative resolution: a missing credential must fail without generation or replacement.

The `dry-run` action performs all safe Production checks and finishes with `READY TO SUBMIT PRODUCTION BUILD`; it never invokes `eas build`, initializes the remote counter, uploads to Play, or publishes an update.
