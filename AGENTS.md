This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Project rules (The System)

- All UI text is English and lives in `src/i18n/` (never hard-code strings in components). Other languages are added as extra language files.
- Build room by room (see README). Finish and test a room before starting the next one.
- Firestore: each player owns `players/{uid}`. Rules are in `firestore.rules` and must be pasted into the Firebase console when they change.
- The website is served from `/The-system` on GitHub Pages (`experiments.baseUrl` in app.json).
- Expo CLI here runs with `EXPO_OFFLINE=1` when api.expo.dev is unreachable.
- Native changes (a new library with native code, a config plugin) need a bump of `expo.version` in app.json and a new build. `runtimeVersion` follows the app version, so over-the-air updates only reach builds with the same version.
- Versions: 1.0.0 = room 0 build; 1.1.0 = room 2 with the v0.1 design (adds react-native-svg); 1.2.0 = local notifications (expo-notifications, remote push off); 1.3.0 = photo proof (expo-image-picker, expo-image-manipulator) and haptics (expo-haptics). The `room-1` branch (app blocking) must move to 1.4.0 when it is merged.
- TestFlight: `.github/workflows/testflight.yml` builds the `production` profile and submits it. It needs the GitHub secrets ASC_API_KEY (the .p8 contents), ASC_KEY_ID, ASC_ISSUER_ID and APPLE_TEAM_ID, and the App Store Connect app id in eas.json. TestFlight builds use the `preview` update channel too, so one over-the-air update reaches both.
- Design v0.1 (see the rules doc): black and blue base, purple only for progress, gold for coins and titles, red only for the penalty. Shared pieces live in `src/components/sys.js`.
