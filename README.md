# Kurioticket

Kurioticket is a travel metasearch and provider-handoff product for flights, hotels, cars, and composed Deals.

## Authoritative travel architecture

- Flights use Duffel only.
- Hotels use Hotelbeds only.
- Cars use Kurioticket's server-owned static catalogue. Cars do not expose an external checkout.
- Deals compose those same flight, hotel, and car pipelines; Deals is not a provider.
- Web and native clients call Kurioticket server endpoints and share the same search contracts.
- Provider credentials stay server-side.

Provider failures return bounded empty or unavailable states. The application must never fabricate flight or hotel inventory, insert editorial hotels into live availability, or claim an unsupported car booking action.

## Local setup

Requirements:

- Node.js 24
- npm
- PostgreSQL

Install and start:

```bash
npm ci
cp .env.example .env.local
npm run db:deploy
npm run dev
```

Open `http://localhost:3000`.

## Environment contract

Use `.env.example` as the source of truth. Important categories are:

- database and authentication;
- Google authentication;
- Resend email delivery;
- Duffel flight credentials and active API mode;
- Hotelbeds hotel credentials, base URL, and active API mode;
- server-owned scheduled-job secrets;
- mobile's public Kurioticket API origin.

No car-provider credential is required. Do not put provider, database, authentication, or email secrets in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

## Search endpoints

- `GET /api/flights/search`
- `GET /api/hotels/search`
- `GET /api/cars/search`

Deals calls those product pipelines and preserves their authoritative sources.

## Mobile

The Expo application is in `apps/mobile`. Its only public backend setting is `EXPO_PUBLIC_API_BASE_URL`, which must point to the intended Kurioticket HTTPS origin for staging and production builds. See `apps/mobile/README.md` for development-device setup.

## Database and deployment

Prisma schema and migrations are under `prisma/`.

```bash
npm run check:migration-timestamps
npm run db:deploy:render
```

Render service declarations are in `render.yaml`. Production services deploy from `main`; staging services deploy from `dev`. Web services use `/api/health` for health checks.

## Release checks

Run each command independently and require a zero exit code:

```bash
npm run check:conflicts
npm run check:migration-timestamps
npm run security:secrets
npm test
npm run build

cd apps/mobile
npm run typecheck
npm test
npx expo config --type public
npx expo export --platform android --clear
```

Never treat a started or timed-out build as a pass. Validate staging, provider calls, migrations, service health, cron execution, and cross-client API parity before promoting `dev` to `main`.

## Security

Never commit or log credentials, authorization headers, database URLs, deploy hooks, or personal traveler data. Operational logs should contain only safe metadata such as request ID, product, provider, status, latency, result count, failure category, environment, and deployment SHA.
