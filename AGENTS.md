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
- Planned for the app-blocking build (room-1): a focus lock on quests like Deep study (all apps locked for the quest's length; lock strength chosen by the player: free unlock / unlock costs coins / no unlock), and the phone-free first hour locking apps by itself after the player commits the evening before (`player.commit`).
- Courses (Learn tab): content and rules in `src/game/courses.js` (sets → learn, write, quiz, test; Leitner reviews), progress in `players/{uid}/courses/{courseId}` via `src/lib/courses.js`. Passing a set trains the skill and finishes an open tier-I quest of it. To add a course, add it to `COURSES`; every set needs a `stage` listed in the course's `stages`.
- App Store Connect app: "The system: quest", Apple ID 6839325471 (in eas.json). The first TestFlight build is 1.6.0. Until that build exists, app.json stays at 1.5.0 so over-the-air updates keep reaching the installed 1.5.0 app; bump to 1.6.0 in the commit right before running testflight.yml.
- TestFlight: `.github/workflows/testflight.yml` builds the `production` profile and submits it. It needs the GitHub secrets ASC_API_KEY (the .p8 contents), ASC_KEY_ID, ASC_ISSUER_ID and APPLE_TEAM_ID, and the App Store Connect app id in eas.json. TestFlight builds use the `preview` update channel too, so one over-the-air update reaches both.
- Shop themes live in `SKINS` (`src/game/shop.js`): common = colours only; rare/legendary also set `shape` (frame outline in `sys.js`) and `backdrop` (drawn by `Glow`). Price comes from rarity (`SKIN_PRICES`). Titles are earned, never bought: `src/game/titles.js` (counters in `players.feats`, written in `completeQuest`). Test accounts: `tester: true` on the player doc (set by hand in the Firebase console) shows Tester tools in Settings and gives every title.
- Sub-scenarios (urgent quests, `src/game/urgent.js`): short tasks only from skills the player ticked, offered only while the situation is "home", as a small notice above the tab bar (`Urgent.js`). Passing or timing out costs nothing; no notifications are scheduled for them. System messages are scenario style: stacked [bracketed] boxes that type out (`Scenario.js`, `SystemPopup.js`).
- First quests (`src/game/firstQuests.js`, `FirstQuests.js`): new players (xp 0, no `firstDone`) get an empty board and six setup steps instead (name, skills, day, busy times, best time, maxes), 5 coins each. When all are cleared, `claimFirst` sets `firstDone` and builds today's real board. No penalty or sub-scenarios before that.
- Sleep: now = sleep window `bed`–`bedLate` and wake window `wake`–`wakeLate`; goal = `bedGoal` (asleep before) and `wakeGoal`–`wakeGoalLate`, set at `goalAt`. Tonight moves 15 min a week from now towards the goal (`bedTonight`, `wakeTonight` in game/profile.js; `dayTimes` returns them). Slow morning (`player.morning.slow`, on by default) keeps quests out of the routine (×1.5 time + 15 min) and puts hard quests first in the best-time window.
- Your way per skill: `profile.skillPrefs[skill]` = { focus, limit, maxMin, km } (SkillPage); `withPrefs` in game/guild.js applies it in `getQuest`.
- To-dos: `players.todos` (game/todos.js, lib/todos.js, Todos.js): roll over until done, +2 coins for the first 5 a day.
- Never miss twice (game/comeback.js): a tracked habit kept up lately but missed yesterday comes back as main quest `cb:<habit>`, one step harder.
- Links: `thesystem://do/<action>` (app/do/[action].js → lib/links.js): water, todo?text=…&when=tomorrow, and tab names. For the iPhone Shortcuts app ("Open URL"). Widgets and long-press quick actions need native code and a new build.
- Swipe back: wrap a full-screen page in `SwipeBack` (components/SwipeBack.js) with its back/close handler; Shell wraps the tabs with the back-pill trail.
- Simple mode (`player.simple`, Settings → The System): hides programs, trials, the side quest and tomorrow's commitment on the quest screen.
- Penalty redemptions need a minimum time from when they're chosen (`startedAt`, `redemptionReadyAt`), plus a photo for run, cycle and tidy. Severity "off" = no Penalty Zone.
- This week (game/week.js, lib/week.js, Week.js): `players.week = { key: Monday, items }`, skill or free-text items with times and an optional day (+time). Skill items planned for today go on `day.guild`; a text one planned today becomes the side quest `wk:<id>`. Any week item, to-do (`todo:<id>`) or skill can be made today's side quest (`setSide`, `day.side.chosen`).
- Week items: tick "I did it" (+3 coins, `tickWeekItem`), and `suggestWhen` proposes a free day/time this week (Plan: …). Notification voice (game/voice.js, Settings → Notifications): quotes, coach, calm or the player's own lines (`players.voice`).
- Observers (`src/lib/observers.js`): friends known only by their worn title. Opening a friend's profile writes a "watch" event (once a day) to `public/{friend}/events`; sponsoring pays 5/20/50 of your own coins into an event the receiver claims. Needs the `events` rule in firestore.rules.
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
