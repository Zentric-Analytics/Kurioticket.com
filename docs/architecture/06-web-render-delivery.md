# 6. Web and Render delivery

## Service

- Staging service: `kurioticket.com-staging` (service id `srv-d86ulfgg4nts73bctt20`).
- Main production service is repository-backed as `main`-driven Render web deploy.

## Delivery details (staging)

- Branch: `dev`
- Build: `npm ci && npm run build`
- Pre-deploy: `npm run db:deploy:render`
- Start: `npm run start`
- Health path: `/api/health`
- Extra behavior: staging badge includes immutable deployed SHA.

## Verification posture

- Staging is verified by documented external evidence from this phase (`staging.kurioticket.com`, `srv-d86ulfgg4nts73bctt20`, deployed SHA checks and badge checks).
- Production web delivery remains repository-driven from `main`; this handbook records it as implemented and verified through repository policy and prior production deployment ownership.
