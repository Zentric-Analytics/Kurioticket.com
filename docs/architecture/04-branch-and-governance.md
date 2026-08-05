# 4. Branch and governance

## Branch model

1. `feature/*` and teammate branches open PRs into `dev`.
2. Required checks run on `dev` PRs.
3. After checks and review, changes merge to `dev`.
4. Render deploys staging from `dev` automatically.
5. Production is only changed via owner-authorized process from `main`.

## Verified state

- working docs branch: `docs/finalize-delivery-platform-baseline`
- branch target for this handbook: `dev`
- main SHA: `20e3f10baf7fa1e9bb85df81dedaff964e4da043`
- dev SHA: `4e424369b70ccab7a3863b7b88f713ce33cf1c7e`
- merge base: `20e3f10baf7fa1e9bb85df81dedaff964e4da043`

## Governance

- `dev` is used for routine delivery.
- `main` remains owner/admin controlled for production operations.
- Required checks and review boundaries remain in place.
- No automatic production delivery occurs from ordinary `dev` merges.
