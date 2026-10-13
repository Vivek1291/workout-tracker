import { SetLog, WorkoutSession } from '../types';
import { bucketKey, Period } from './periods';
import { countedSets, estimate1RM } from './stats';

export interface ExerciseInPeriod {
  exerciseId: string;
  sessions: number;
  sets: number; // working sets (warm-ups excluded)
  reps: number;
  volume: number;
  best1RM: number;
  topWeight: number;
  /** All completed sets (warm-ups included) of the latest session in the period, in order. */
  latest: { sessionId: string; date: string; sets: SetLog[] };
  /** Change in best est. 1RM vs the previous period this exercise was trained in, if any. */
  strengthChangePct: number | null;
}

export interface PeriodTotals {
  workouts: number;
  sets: number;
  reps: number;
  volume: number;
  /** Volume per working set. */
  efficiency: number;
}

export interface PeriodDetails {
  key: string;
  sessions: WorkoutSession[];
  totals: PeriodTotals;
  exercises: ExerciseInPeriod[];
  previousKey: string | null;
  previous: PeriodTotals | null;
  /** Volume change % vs previous period. */
  powerGainPct: number | null;
  /** Efficiency (volume per set) change % vs previous period. */
  efficiencyChangePct: number | null;
  /** Average est. 1RM change % over exercises trained in both periods. */
  strengthGainPct: number | null;
}

const pct = (cur: number, prev: number | undefined | null) => (prev && prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

function finished(sessions: WorkoutSession[]) {
  return sessions.filter((s) => s.finishedAt && s.entries.some((e) => countedSets(e.sets).length > 0));
}

function totalsOf(sessions: WorkoutSession[]): PeriodTotals {
  let sets = 0;
  let reps = 0;
  let volume = 0;
  for (const s of sessions)
    for (const e of s.entries)
      for (const set of countedSets(e.sets)) {
        sets++;
        reps += set.reps;
        volume += set.reps * set.weight;
      }
  volume = Math.round(volume);
  return { workouts: sessions.length, sets, reps, volume, efficiency: sets ? Math.round((volume / sets) * 10) / 10 : 0 };
}

function best1RMByExercise(sessions: WorkoutSession[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sessions)
    for (const e of s.entries)
      for (const set of countedSets(e.sets)) m.set(e.exerciseId, Math.max(m.get(e.exerciseId) ?? 0, estimate1RM(set.weight, set.reps)));
  return m;
}

/** Everything shown in the "tap a bar" details sheet for one day/week/month/year. */
export function periodDetails(allSessions: WorkoutSession[], period: Period, key: string): PeriodDetails {
  const done = finished(allSessions);
  const inBucket = done
    .filter((s) => bucketKey(s.date, period) === key)
    .sort((a, b) => (a.date + a.startedAt < b.date + b.startedAt ? -1 : 1));

  // Previous period = the latest earlier period that has any training.
  const earlierKeys = done.map((s) => bucketKey(s.date, period)).filter((k) => k < key);
  const previousKey = earlierKeys.length ? earlierKeys.reduce((a, b) => (a > b ? a : b)) : null;
  const prevSessions = previousKey ? done.filter((s) => bucketKey(s.date, period) === previousKey) : [];

  const totals = totalsOf(inBucket);
  const previous = previousKey ? totalsOf(prevSessions) : null;

  // Per exercise. For per-exercise strength change, compare with the last earlier period that exercise appears in.
  const map = new Map<string, ExerciseInPeriod>();
  for (const s of inBucket) {
    for (const e of s.entries) {
      const working = countedSets(e.sets);
      const completed = e.sets.filter((x) => x.completed);
      if (completed.length === 0) continue;
      const cur =
        map.get(e.exerciseId) ??
        ({ exerciseId: e.exerciseId, sessions: 0, sets: 0, reps: 0, volume: 0, best1RM: 0, topWeight: 0, latest: { sessionId: s.id, date: s.date, sets: [] }, strengthChangePct: null } as ExerciseInPeriod);
      if (cur.latest.sessionId !== s.id || cur.sessions === 0) {
        cur.sessions++;
        cur.latest = { sessionId: s.id, date: s.date, sets: [] };
      }
      cur.latest.sets.push(...completed);
      for (const set of working) {
        cur.sets++;
        cur.reps += set.reps;
        cur.volume += set.reps * set.weight;
        cur.best1RM = Math.max(cur.best1RM, estimate1RM(set.weight, set.reps));
        cur.topWeight = Math.max(cur.topWeight, set.weight);
      }
      map.set(e.exerciseId, cur);
    }
  }

  const strengthChanges: number[] = [];
  for (const ex of map.values()) {
    ex.volume = Math.round(ex.volume);
    const earlier = done.filter((s) => bucketKey(s.date, period) < key && s.entries.some((e) => e.exerciseId === ex.exerciseId && countedSets(e.sets).length));
    if (earlier.length === 0 || ex.best1RM === 0) continue;
    const lastKey = earlier.map((s) => bucketKey(s.date, period)).reduce((a, b) => (a > b ? a : b));
    const prevBest = best1RMByExercise(earlier.filter((s) => bucketKey(s.date, period) === lastKey)).get(ex.exerciseId);
    ex.strengthChangePct = pct(ex.best1RM, prevBest);
    if (ex.strengthChangePct !== null) strengthChanges.push(ex.strengthChangePct);
  }

  return {
    key,
    sessions: inBucket,
    totals,
    exercises: [...map.values()].sort((a, b) => b.volume - a.volume || b.sets - a.sets),
    previousKey,
    previous,
    powerGainPct: previous ? pct(totals.volume, previous.volume) : null,
    efficiencyChangePct: previous ? pct(totals.efficiency, previous.efficiency) : null,
    strengthGainPct: strengthChanges.length
      ? Math.round((strengthChanges.reduce((a, b) => a + b, 0) / strengthChanges.length) * 10) / 10
      : null,
  };
}
