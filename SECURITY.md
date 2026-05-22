# Security Policy

Curioticket is built for real production services. Do not commit secrets.

## Secret Handling

- Store production secrets in Render environment variables.
- Store local development secrets in `.env.local`.
- Commit only `.env.example`.
- Do not expose server secrets with `NEXT_PUBLIC_`.
- Rotate any key that is accidentally committed or shared.

## Secret Scanning

GitHub Secret Protection and secret scanning should be enabled for the repository. Before pushing, run:

```bash
npm run security:secrets
```

If a secret is found in git history:

1. Revoke and rotate the key immediately.
2. Remove the secret from the repository and any open pull requests.
3. Audit provider usage logs for unexpected activity.
4. Re-deploy with the rotated Render environment variable.

## Reporting

For security issues, contact the maintainers listed in `ADMIN_EMAILS` for the deployed environment.
