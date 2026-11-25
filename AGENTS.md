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
- Versions: 1.0.0 = room 0 build; 1.1.0 = room 2 with the v0.1 design (adds react-native-svg); 1.2.0 = local notifications (expo-notifications, remote push off); 1.3.0 = photo proof (expo-image-picker, expo-image-manipulator) and haptics (expo-haptics); 1.4.0 = sound effects (expo-audio, no microphone). 1.5.0 = location (expo-location: situation, places, weather, troll place checks) and the iPhone Calendar agenda (expo-calendar, read only). 1.6.0 (next build) = speech for the Learn courses (expo-speech), loaded lazily in `src/lib/speech.js` behind a native-module check, so 1.5.0 builds just hide the LISTEN button. The `room-1` branch (app blocking) must move to 1.7.0 when it is merged. expo-location (location, places and weather) is installed but loaded lazily in `src/lib/location.js` with a try/catch, so 1.4.0 builds without it keep working (location just reads as unavailable); it starts working with the next build. Keep any new use of it behind that loader. expo-calendar (agenda from the iPhone Calendar, read only) works the same way in `src/lib/calendar.js`.
- Courses (Learn tab): content and rules in `src/game/courses.js` (sets → learn, write, quiz, test; Leitner reviews), progress in `players/{uid}/courses/{courseId}` via `src/lib/courses.js`. Passing a set trains the skill and finishes an open tier-I quest of it. To add a course, add it to `COURSES`; every set needs a `stage` listed in the course's `stages`.
- TestFlight: `.github/workflows/testflight.yml` builds the `production` profile and submits it. It needs the GitHub secrets ASC_API_KEY (the .p8 contents), ASC_KEY_ID, ASC_ISSUER_ID and APPLE_TEAM_ID, and the App Store Connect app id in eas.json. TestFlight builds use the `preview` update channel too, so one over-the-air update reaches both.
- Design v0.1 (see the rules doc): black and blue base, purple only for progress, gold for coins and titles, red only for the penalty. Shared pieces live in `src/components/sys.js`.

## Test version first

- New work goes to the `dev` branch. A push to dev rebuilds the websites: the live site (`/The-system`) from main and the test site (`/The-system/test`, with a TEST VERSION label) from dev. The iPhone app is not touched.
- "Ship it" = merge dev into main (fast-forward). That updates the live website and sends the over-the-air update to the iPhone.
- The test site uses the same Firebase project and login as the live app, so test with care: it reads and writes real player data.

## Design principles (from Atomic Habits, Tiny Habits, The Power of Habit, Hooked, How to Change, Octalysis, self-determination theory)
The app exists to make people do the thing. Every screen and feature should be checked against these:
1. **Obvious (cue).** The first thing on the quest screen answers "what do I do now?". Quests carry a when/where ("after school, at home"): if-then plans roughly double follow-through (Gollwitzer & Sheeran 2006, d ≈ .65). Stack new habits on old ones ("after I brush my teeth…").
2. **Easy (ability).** Depth goes into the systems, never into the tap: logging anything is one tap. Every habit has a tiny version (2-minute rule) for bad days. Remove steps before adding features.
3. **Attractive (craving).** Identity first: each quest is a vote for who you are becoming ("+1 vote: Reader"). Pair hard quests with something liked (temptation bundling). Use fresh starts (Monday, the 1st, a birthday) to begin new things.
4. **Satisfying (reward).** Celebrate right away (Fogg's "shine"): a quest clear must feel good within a second (window, sound, haptic, numbers counting up). Some rewards are variable (a rare drop), most are earned and predictable.
5. **Forgiving streaks.** Missing one day does not hurt habit forming (Lally 2010, ~66 days on average, range 18–254). Rule: never miss twice. Shields/tiny versions keep a streak; a broken streak must never feel like the end.
6. **White hat over black hat (Octalysis).** Meaning, progress and choice keep people for years; pressure (penalties, scarcity, fear of loss) only sparks action. Use pressure sparingly (Hard mode, urgent quests) and always opt-in.
7. **Autonomy, competence, relatedness (SDT).** Let people choose between options, keep challenge just above their level (Goldilocks: adapt to completion rate), and do things with friends.
8. **Show state.** Buffs, streaks and progress the player earned must be visible where they play (the quest screen), not buried in a menu.
