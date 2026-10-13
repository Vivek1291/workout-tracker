/**
 * Reference REST API that stores the app's data in MongoDB.
 * It implements exactly the contract used by src/storage/remoteAdapter.ts.
 *
 *   MONGODB_URI=mongodb://localhost:27017 API_KEY=secret npm start
 */
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'workout_tracker';
const API_KEY = process.env.API_KEY || '';
const COLLECTIONS = ['exercises', 'plans', 'sessions', 'foods', 'foodLogs', 'waterLogs', 'bodyLogs', 'profile'];

async function main() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  for (const c of COLLECTIONS) await db.collection(c).createIndex({ id: 1 }, { unique: true });

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));

  app.use('/api', (req, res, next) => {
    if (API_KEY && req.get('x-api-key') !== API_KEY) return res.status(401).send('Invalid API key');
    next();
  });

  const strip = ({ _id, ...doc }) => doc;
  const collection = (name) => (COLLECTIONS.includes(name) ? db.collection(name) : null);

  app.get('/api/data', async (_req, res) => {
    const out = { version: 1 };
    for (const c of COLLECTIONS) out[c] = (await db.collection(c).find().toArray()).map(strip);
    res.json(out);
  });

  app.put('/api/data', async (req, res) => {
    for (const c of COLLECTIONS) {
      const docs = Array.isArray(req.body[c]) ? req.body[c].map(strip) : [];
      await db.collection(c).deleteMany({});
      if (docs.length) await db.collection(c).insertMany(docs);
    }
    res.sendStatus(204);
  });

  app.put('/api/:collection/:id', async (req, res) => {
    const col = collection(req.params.collection);
    if (!col) return res.status(404).send('Unknown collection');
    const doc = { ...strip(req.body), id: req.params.id };
    await col.replaceOne({ id: doc.id }, doc, { upsert: true });
    res.sendStatus(204);
  });

  app.delete('/api/:collection/:id', async (req, res) => {
    const col = collection(req.params.collection);
    if (!col) return res.status(404).send('Unknown collection');
    await col.deleteOne({ id: req.params.id });
    res.sendStatus(204);
  });

  app.listen(PORT, () => console.log(`Workout API on http://localhost:${PORT}/api (db: ${DB_NAME})`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
