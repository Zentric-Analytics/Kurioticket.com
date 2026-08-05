# 14. Credentials and secrets

## Inventory by location (non-secret metadata)

- GitHub repository and environment secrets: used by workflow runs (e.g., `EXPO_TOKEN`, platform credentials as named secrets).
- EAS tokens and credentials: stored and managed by Expo/EAS project.
- Render env variables for DB/API keys and SMTP/service keys are sync=false.
- Apple credentials/keys: used by TestFlight submission workflows.

## Risk notes

- No secret material is in docs.
- Secrets are operationally critical, externally stored, and should be rotated per platform policy.
- Concrete owner and rotation metadata are maintained in platform consoles; this handbook records non-secret ownership roles and required periodic review cadence.

## Separation principle

- Preview and production credentials are intentionally not interchangeable.
- Workflows use environment/scoping checks to prevent fallback onto mismatched credentials.
