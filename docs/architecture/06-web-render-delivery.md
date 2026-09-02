# 6. Web and Render delivery

## Service

- Staging service: `Kurioticket-web-staging` (service id `srv-dabmo50jo6nc73881d60`).
- Main production service is repository-backed as `main`-driven Render web deploy.

## Delivery details (staging)

- Branch: `dev`
- Build: `npm ci && npm run build`
- Pre-deploy: `npm run db:deploy:render`
- Start: `npm run start`
- Health path: `/api/health`
- Extra behavior: staging badge includes immutable deployed SHA.

## Verification posture

- Staging is verified by current external evidence (`staging.kurioticket.com`, `srv-dabmo50jo6nc73881d60`, branch `dev`, healthy deployment checks).
- Production web delivery remains repository-driven from `main`; this handbook records it as implemented and verified through repository policy and prior production deployment ownership.
