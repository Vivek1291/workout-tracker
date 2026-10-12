# Workout Tracker

A workout planner and logger for **iOS and the web**, built with React Native + Expo (Expo Router, TypeScript).
One codebase runs as a native iPhone app and as a React web app.

## Features

- **Day-wise plans.** Two schedule types, and both repeat forever:
  - *Weekly*: assign a workout or a rest day to each day, Mon–Sun.
  - *Rotation*: an N-day cycle (e.g. Push / Pull / Legs / Rest) that repeats from a start date.
- **Rest days.** Toggle any day to rest.
- **Fully editable.** Rename days, add, remove or reorder exercises and days, set targets (sets × reps × weight), duplicate plans, and choose which plan is active.
- **Choose before you start.** The Today screen shows the scheduled workout, and you can pick any other day of the plan (or a freestyle workout) before tapping **Start**.
- **Live logging.** Log weight and reps per set, tick sets as done, add sets or drop sets, and mark sets as warm-up, working, drop set or to failure. You can also add exercises mid-workout, write notes, and edit the date to log past workouts.
- **Progressive overload.** Each planned exercise has a progression rule. The app uses your last session to suggest today's target:
  - *Fixed*: always use the planned target.
  - *Linear overload*: if you hit every rep last time, add the weight increment.
  - *Double progression*: add reps inside a range (e.g. 8–12). Once every set reaches the top, add weight and go back to the bottom of the range.
  - *Repeat last*: copy your previous session.
- **History.** Every workout with its sets, reps and weight, plus all-time totals (workouts, sets, reps, total weight lifted). Searchable by exercise.
- **Progress.**
  - *Daily*: volume, reps or sets per day (bar chart), plus a day-by-day table.
  - *By exercise*: top weight, estimated 1RM, volume or reps per session (line chart), all-time records, and a session log.
  - Ranges: 30 days, 90 days, 1 year, or all time.
- **Exercise library.** Comes with common lifts. Add, edit or delete your own, grouped by muscle.
- **Your data as JSON.** Stored on the device (AsyncStorage, which is `localStorage` on web). Export or import the whole dataset as JSON from Settings.
- **MongoDB-ready.** Switch storage to a REST API in Settings. A reference Express + MongoDB server is in [`server/`](server/README.md).

## Run it

```bash
npm install
npm run web      # opens in the browser
npm run ios      # iOS simulator (needs macOS + Xcode), or scan the QR code with Expo Go on your iPhone
npm start        # dev server; choose the platform from the menu
```

Build a real iOS app with EAS (no Xcode required): `npx eas-cli@latest build -p ios`.

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
