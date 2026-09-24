# OpenDash iOS

iOS wrapper of **[OpenDash](https://github.com/subtlesayak/open-dash)** — the open-source Android companion for motorcycle ownership, trip prep, garage, expenses, and ride-adjacent tools.

This project exists because OpenDash is Android-only today. **OpenDash iOS** is a native-feeling iPhone app that migrates the rider-facing features from that Android codebase so Himalayan 450 (and other) owners can use the same workflow on iOS.

> Inspired by and migrated from [subtlesayak/open-dash](https://github.com/subtlesayak/open-dash) (Apache 2.0).  
> Independent and unofficial. Not affiliated with Royal Enfield.

> [!WARNING]
> Like the Android project, this app does **not** pair with, project to, or control a motorcycle dashboard. OpenDash removed dash connection and projection after Royal Enfield contacted the project. This iOS wrapper follows the same app-only direction.

## Inspiration

[OpenDash](https://github.com/subtlesayak/open-dash) is the source of truth for product design, data model, Himalayan 450 maintenance schedule, expense categories, themes, and the local-first rider workflow.

iOS cannot run an Android APK, so this is not a WebView shell around the Play Store app. It is a from-scratch iOS implementation (Expo / React Native) that ports the Android app-only features:

| Android OpenDash | OpenDash iOS |
| --- | --- |
| Vehicles, PUC, insurance, service | Migrated — Himalayan 450 is the default bike |
| Expenses + CSV import/export | Migrated |
| Garage, odometer, fuel mileage | Migrated |
| Himalayan 450 periodical maintenance (manual pp. 122–127) | Migrated |
| Route preview from Maps / `geo:` links | Migrated — opens Apple Maps or Google Maps |
| Ride history | Migrated — phone GPS recording |
| Appearance themes (Hanle Black and the other OpenDash palettes) | Migrated |
| Local-first storage | Migrated — SQLite on device |
| Downloadable wallpaper pack | Not in this first release |
| Optional Firebase / Google sync | Not in this first release (bring-your-own later) |
| Dash pairing / projection | **Out of scope** on both platforms |

## First use

1. Add your motorcycle in **Vehicles** (Himalayan 450 is already there).
2. Set odometer, PUC, insurance, and service details.
3. Log fuel, maintenance, and ownership costs in **Garage** and **Expenses**.
4. Paste a destination or `geo:` link under **More → Preview a route**.
5. Record rides from **More → Ride history**.

## Run on an iPhone

You do not need a paid Apple Developer account to try it.

1. Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779).
2. Clone and start the project:

```bash
git clone https://github.com/balianurag/open-dash-ios.git
cd open-dash-ios
npm install
npx expo start
```

3. Scan the QR code with the Camera app (or Expo Go). The phone and Mac must be on the same Wi-Fi.

To produce a native Xcode project later (TestFlight / a home-screen app without Expo Go):

```bash
npx expo prebuild --platform ios
```

That step needs Xcode.

## Related projects

- **[OpenDash (Android)](https://github.com/subtlesayak/open-dash)** — original app this wrapper is based on
- [NorthStar](https://github.com/adityadasika21/NorthStar) — earlier lineage credited by OpenDash
- [better-dash](https://github.com/norbertFeron/better-dash) — earlier lineage credited by NorthStar

## License

Apache License 2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

Historical attribution required by those licenses is preserved. Royal Enfield, Himalayan, and related names remain trademarks of their owners.
