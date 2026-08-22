# Kurioticket Mobile

Expo + React Native + TypeScript application for iOS and Android.

The permanent application identities are Preview and Production. See [docs/environments.md](docs/environments.md) for the exact bundle IDs, packages, schemes, API origins, EAS profiles, security rules, and approval gates.

## Prerequisites

- Node.js and npm compatible with the repository.
- Expo Go on a physical device, or Android Studio / Xcode simulators where supported.
- The existing Next.js backend running separately.

## Installation

```bash
cd apps/mobile
npm install
```

## Environment setup

Copy `.env.example` to `.env` and set an explicit local API origin:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

Do not put secrets in `EXPO_PUBLIC_*` values. For a physical phone, `localhost` is the phone itself, not your computer. Use your computer LAN IP instead, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:3000
```

Start the Next.js backend bound to an address your device can reach, then ensure firewalls allow inbound traffic to port 3000.

## Start local Preview

```bash
npm run local:preview
```

This command reuses the `Kurioticket Preview` application identity. There is no separate development application identity. Release builds reject local overrides.

## Expo Go

Scan the QR code shown by Expo. If the API is unreachable, verify the phone and computer are on the same network and that `EXPO_PUBLIC_API_BASE_URL` uses the computer LAN IP.

## Android

```bash
npm run android
```

Android emulators commonly reach the host computer at `http://10.0.2.2:3000`.

## iOS

```bash
npm run ios
```

Requires macOS and Xcode. iOS simulators can usually reach `http://localhost:3000`; physical iPhones need the computer LAN IP.

## Troubleshooting

- **Missing environment variable:** create `apps/mobile/.env` with `EXPO_PUBLIC_API_BASE_URL` and restart Expo.
- **Unreachable API:** check backend is running, URL includes protocol, device is on the same network, and firewall allows port 3000.
- **Firewall:** allow local network access to the backend port.

## Current milestone scope

- Production home screen with legacy welcome and connection-status routes redirected back to `/`.
- Calls only `GET /api/mobile/v1/health` and `GET /api/mobile/v1/config`.
- Flights, hotels, cars, and Deals use the shared Kurioticket API contracts.

## Postponed features

Push notifications, native payments, and new Apple capabilities require separate approval.

## Visual verification steps

1. Start the existing Next.js backend.
2. Confirm `/api/mobile/v1/health` works in a browser.
3. Set `EXPO_PUBLIC_API_BASE_URL`.
4. Start Expo.
5. Open the app on a device or emulator.
6. Confirm the production Home screen appears.
7. If a device has a cached deep link to `/welcome` or `/connection-status`, confirm it redirects back to `/`.
8. Confirm Flights, Hotels, Cars, and Deals tabs each render a search form.
9. Confirm unsupported hotel, car, and deal result integrations show graceful non-blocking messages after valid submission.

## Assets needing final review

Final app icon and splash assets are postponed because Codex PR creation does not support newly added binary files. This milestone uses a text-based in-app Kurioticket wordmark and allows Expo default native artwork temporarily.
