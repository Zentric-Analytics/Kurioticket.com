# Kurioticket Mobile

Initial Expo + React Native + TypeScript shell for visual mobile review.

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

Copy `.env.example` to `.env` and set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

Do not put secrets in `EXPO_PUBLIC_*` values. For a physical phone, `localhost` is the phone itself, not your computer. Use your computer LAN IP instead, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:3000
```

Start the Next.js backend bound to an address your device can reach, then ensure firewalls allow inbound traffic to port 3000.

## Start Expo

```bash
npm run start
```

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
- **CORS:** Expo native requests usually do not enforce browser CORS, but Expo web does. Configure the backend only after separate approval if web CORS blocks review.
- **Firewall:** allow local network access to the backend port.

## Current milestone scope

- Launch screen, welcome screen, home shell, and connection-status screen.
- Calls only `GET /api/mobile/v1/health` and `GET /api/mobile/v1/config`.
- Flights shown as available; hotels, cars, push notifications, social authentication, and premium subscriptions shown as disabled or coming later.

## Postponed features

Authentication, Prisma/database work, travel search, booking, payments, push notifications, provider integrations, staging changes, and production changes are intentionally postponed.

## Visual verification steps

1. Start the existing Next.js backend.
2. Confirm `/api/mobile/v1/health` works in a browser.
3. Set `EXPO_PUBLIC_API_BASE_URL`.
4. Start Expo.
5. Open the app on a device or emulator.
6. Confirm the welcome screen renders.
7. Tap `Continue`.
8. Open `Connection Status`.
9. Confirm backend shows connected.
10. Confirm flights are enabled.
11. Confirm hotels and cars are disabled.
12. Turn off the backend temporarily and confirm the safe disconnected state appears.
13. Restart the backend and use Refresh to confirm reconnection.

## Assets needing final review

Final app icon and splash assets are postponed because Codex PR creation does not support newly added binary files. This milestone uses a text-based in-app Kurioticket wordmark and allows Expo default native artwork temporarily.
