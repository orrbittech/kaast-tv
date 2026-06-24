# KAAST TV

Apple TV and Android TV player for **KAAST** — pair with the mobile app and play scheduled playlists.

Built by **Brandon Nkawu** for [Orrbit Systems](https://www.orrbit.co.za/). Proprietary product — see [LICENSE](./LICENSE).

## Stack

- Expo TV (`react-native-tvos`)
- Expo Router
- WebSocket media control

## Setup

```bash
yarn install
cp .env.example .env
yarn start
# TV builds
yarn prebuild:tv
```

## Pairing

1. TV displays a 6-digit code
2. Enter the code in the KAAST mobile app (Devices)
3. Requires an active org trial or subscription

## Legal

- Privacy: https://kaast.app/privacy
- Terms: https://kaast.app/terms
