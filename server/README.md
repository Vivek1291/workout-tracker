# Workout Tracker API (optional, MongoDB)

The app stores everything on the device by default. This small Express server lets you
move the same JSON data into MongoDB later. It is not needed to run the app.

```bash
cd server
npm install
MONGODB_URI="mongodb://localhost:27017" API_KEY="choose-a-secret" npm start
```

Then in the app: **Settings → Storage → Remote API (MongoDB)**
- API base URL: `http://<your-computer-ip>:4000/api` (use your LAN IP from an iPhone, not `localhost`)
- API key: the `API_KEY` you started the server with
- Tap **Switch & copy my data** to upload what's on the device.

Collections: `exercises`, `plans`, `sessions`, `foods`, `foodLogs`, `waterLogs`, `bodyLogs`, `profile`. Each document keeps the app's `id` field (unique index),
so documents look the same as in the exported JSON.

| Method | Path | Body |
|---|---|---|
| GET | `/api/data` | — returns `{ version, exercises, plans, sessions }` |
| PUT | `/api/data` | full dataset (replaces everything) |
| PUT | `/api/:collection/:id` | one document (upsert) |
| DELETE | `/api/:collection/:id` | — |
