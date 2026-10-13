# Workout Tracker

A workout planner and logger for **iOS and the web**, built with React Native + Expo (Expo Router, TypeScript).
One codebase runs as a native iPhone app and as a React web app.

## Features

- **Day-wise plans.** Two schedule types, and both repeat forever:
  - *Weekly*: assign a workout or a rest day to each day, Mon–Sun.
  - *Rotation*: an N-day cycle (e.g. Push / Pull / Legs / Rest) that repeats from a start date.
- **Rest days.** Toggle any day to rest.
- **Fully editable.** Rename days, add, remove or reorder exercises and days, set targets (sets × reps × weight), duplicate plans, and choose which plan is active.
- **Guided start.** First-time users get a 3-step guide. The Today screen shows this week (✓ done, R rest) and today's workout with one Start button.
- **Choose before you start.** The Today screen shows the scheduled workout, and you can pick any other day of the plan (or a freestyle workout) before tapping **Start**.
- **Live logging.** Log weight and reps per set, tick sets as done, add sets or drop sets, and mark sets as warm-up, working, drop set or to failure. You can also add exercises mid-workout, write notes, and edit the date to log past workouts. A progress bar shows sets done, and a rest timer starts each time you tick a set.
- **Progressive overload.** Each planned exercise has a progression rule. The app uses your last session to suggest today's target:
  - *Fixed*: always use the planned target.
  - *Linear overload*: if you hit every rep last time, add the weight increment.
  - *Double progression*: add reps inside a range (e.g. 8–12). Once every set reaches the top, add weight and go back to the bottom of the range.
  - *Repeat last*: copy your previous session.
- **History.** Every workout with its sets, reps and weight, plus all-time totals (workouts, sets, reps, total weight lifted). Searchable by exercise.
- **Progress by day, week, month and year.** Switch the period at the top of the Progress tab.
  - *Overview*: how much you lifted (volume), workouts, reps and sets per period as a bar chart. A comparison card shows the last completed period vs the one before, with ▲/▼ % change. A "Strength change" list shows each exercise's estimated 1RM, first → latest in the range.
  - *By exercise*: estimated 1RM, heaviest set, volume or reps per period. A summary shows how much it went up since the start of the range, plus all-time personal records and recent sessions.
  - Switch any chart between bar and line with the icons in its corner.
  - Tap a bar or point to open its details: workouts, sets, reps and volume, plus a donut chart splitting the day/week/month/year by exercise (volume or sets). It also shows every exercise's set-by-set chart and gains vs the previous period:
    - *Strength gain*: average change in estimated 1RM.
    - *Power gain*: change in volume.
    - *Efficiency*: weight lifted per working set.
- **Set-by-set chart** (e.g. WU1 20×30 kg → S1 37 kg → S2 42 kg). It shows in each workout, in Progress → By exercise for any session you tap, and in the details popup.
- **Exercise library.** 80 exercises across Chest, Back, Legs, Shoulders, Core, Forearms, Triceps and Biceps. Each one lists its primary and secondary muscles and has a front/back body diagram highlighting them. For each exercise you can choose the picture: the body diagram (tap muscles on it to set primary/secondary yourself) or your own photo, uploaded or taken with the camera, cropped and shrunk to a few KB. Add, edit or delete your own. Timed exercises (plank, dead hang) log seconds instead of reps.
- **Ready-made 6-day Push / Pull / Legs plan.** Mon–Sat are Push A, Pull A, Legs A, Push B, Pull B, Legs B (each with abs), and Sunday is rest. It's loaded and made active automatically, and repeats every week. Each exercise uses double progression through its rep range, e.g. 3 × 8–10. You can add another copy from Plans → "Add 6-day Push / Pull / Legs template".
- **Your data as JSON.** Stored on the device (AsyncStorage, which is `localStorage` on web). Export or import the whole dataset as JSON from Settings.
- **MongoDB-ready.** Switch storage to a REST API in Settings. A reference Express + MongoDB server is in [`server/`](server/README.md).

## Run it

```bash
npm install
npm run web      # opens in the browser
npm run ios      # iOS simulator (needs macOS + Xcode), or scan the QR code with Expo Go on your iPhone
npm start        # dev server; choose the platform from the menu
```

### On your phone (quick, no build)

Install **Expo Go** from the App Store or Play Store, run `npm start` on your computer, and scan the QR code.
Your phone and computer must be on the same Wi-Fi (or use `npx expo start --tunnel`).

### Android APK

APKs are built in the cloud with EAS. You need a free account at expo.dev.

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview   # produces an installable .apk
```

When the build finishes, open the link or QR code on your Android phone, download the APK and install it.
You may need to allow installing apps from unknown sources.

The `production` profile builds an `.aab` for the Play Store instead.

### iOS app

`npx eas-cli@latest build -p ios` (needs an Apple Developer account to install on a real iPhone).

```bash
npm test           # unit tests for scheduling, progression and stats
npm run typecheck
```

## Project layout

```
src/
  app/                    Screens (Expo Router: every file is a route)
    (tabs)/index.tsx      Today: pick the day's workout and start it
    (tabs)/plans.tsx      Plan list
    (tabs)/history.tsx    Workout history and all-time totals
    (tabs)/progress.tsx   Daily and per-exercise charts
    (tabs)/exercises.tsx  Exercise library
    plan/[id].tsx         Plan editor
    workout/[id].tsx      Live workout logging (also used to edit past workouts)
    settings.tsx          Units, storage backend, JSON export/import
  data/DataProvider.tsx   App state and actions (React context)
  storage/                Storage adapters (the only code that touches persistence)
    types.ts              StorageAdapter interface and import validation
    localAdapter.ts       On-device JSON (AsyncStorage / localStorage)
    remoteAdapter.ts      REST API, e.g. MongoDB
  lib/                    Pure logic: dates, schedule, progression, stats
  types.ts                Data model
server/                   Optional Express + MongoDB API
```

## Data model and moving to MongoDB

Every record is a plain JSON document with a string `id`, `createdAt` and `updatedAt`. The export file looks like this:

```json
{ "version": 1, "exercises": [...], "plans": [...], "sessions": [...] }
```

Each top-level array maps to one MongoDB collection. The app only talks to persistence through the
`StorageAdapter` interface (`loadAll`, `upsert`, `remove`, `replaceAll`), so a new backend means adding one adapter.
To move to MongoDB today:

1. Run the server in `server/`.
2. In the app, go to Settings → Storage → Remote API.
3. Enter the URL and tap **Switch & copy my data**.
