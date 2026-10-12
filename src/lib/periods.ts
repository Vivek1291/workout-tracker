import { WorkoutSession } from '../types';
import { addDays, parseDateKey, weekdayIndex } from './date';
import { countedSets, estimate1RM } from './stats';

export type Period = 'day' | 'week' | 'month' | 'year';

export const PERIODS: { value: Period; label: string; noun: string }[] = [
  { value: 'day', label: 'Days', noun: 'day' },
  { value: 'week', label: 'Weeks', noun: 'week' },
  { value: 'month', label: 'Months', noun: 'month' },
  { value: 'year', label: 'Years', noun: 'year' },
];

/** How many buckets each view shows, ending with the current one. */
const DEFAULT_COUNT: Record<Exclude<Period, 'year'>, number> = { day: 30, week: 12, month: 12 };

/** Bucket key: day = YYYY-MM-DD, week = Monday's YYYY-MM-DD, month = YYYY-MM, year = YYYY. */
export function bucketKey(dateKey: string, period: Period): string {
  switch (period) {
    case 'day':
      return dateKey;
    case 'week':
      return addDays(dateKey, -weekdayIndex(dateKey));
    case 'month':
      return dateKey.slice(0, 7);
    case 'year':
      return dateKey.slice(0, 4);
  }
}

function previousBucket(key: string, period: Period): string {
  switch (period) {
    case 'day':
      return addDays(key, -1);
    case 'week':
      return addDays(key, -7);
    case 'month': {
      const [y, m] = key.split('-').map(Number);
      return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    }
    case 'year':
      return String(Number(key) - 1);
  }
}

/** Contiguous bucket keys, oldest first, ending with the bucket that contains `today`. */
export function recentBuckets(period: Period, today: string, sessions: WorkoutSession[]): string[] {
  let count: number;
  if (period === 'year') {
    const first = sessions.reduce((min, s) => (s.date < min ? s.date : min), today);
    count = Math.min(10, Number(today.slice(0, 4)) - Number(first.slice(0, 4)) + 1);
  } else {
    count = DEFAULT_COUNT[period];
  }
  const keys = [bucketKey(today, period)];
  while (keys.length < count) keys.unshift(previousBucket(keys[0], period));
  return keys;
}

export function bucketLabel(key: string, period: Period): string {
  switch (period) {
    case 'day':
    case 'week':
      return parseDateKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    case 'month': {
      const d = parseDateKey(`${key}-01`);
      return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }
    case 'year':
      return key;
  }
}

/** Long label for the selected bucket, e.g. "Week of 12 Oct 2026". */
export function bucketTitle(key: string, period: Period): string {
  switch (period) {
    case 'day':
      return parseDateKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    case 'week': {
      const end = addDays(key, 6);
      const f = (k: string) => parseDateKey(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      return `${f(key)} – ${f(end)}`;
    }
    case 'month':
      return parseDateKey(`${key}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    case 'year':
      return key;
  }
}

export interface OverviewBucket {
  key: string;
  workouts: number;
  sets: number;
  reps: number;
  volume: number;
}

export function overviewByPeriod(sessions: WorkoutSession[], period: Period, keys: string[]): OverviewBucket[] {
  const map = new Map<string, OverviewBucket>(keys.map((k) => [k, { key: k, workouts: 0, sets: 0, reps: 0, volume: 0 }]));
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    const b = map.get(bucketKey(s.date, period));
    if (!b) continue;
    let counted = 0;
    for (const e of s.entries) {
      for (const set of countedSets(e.sets)) {
        counted++;
        b.sets++;
        b.reps += set.reps;
        b.volume += set.reps * set.weight;
      }
    }
    if (counted > 0) b.workouts++;
  }
  return keys.map((k) => {
    const b = map.get(k)!;
    return { ...b, volume: Math.round(b.volume) };
  });
}

export interface ExerciseBucket {
  key: string;
  sessions: number;
  topWeight: number | null; // null = not trained in this bucket
  best1RM: number | null;
  volume: number;
  reps: number;
}

export function exerciseByPeriod(sessions: WorkoutSession[], exerciseId: string, period: Period, keys: string[]): ExerciseBucket[] {
  const map = new Map<string, ExerciseBucket>(
    keys.map((k) => [k, { key: k, sessions: 0, topWeight: null, best1RM: null, volume: 0, reps: 0 }]),
  );
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    const b = map.get(bucketKey(s.date, period));
    if (!b) continue;
    const sets = countedSets(s.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets));
    if (sets.length === 0) continue;
    b.sessions++;
    for (const set of sets) {
      b.topWeight = Math.max(b.topWeight ?? 0, set.weight);
      b.best1RM = Math.max(b.best1RM ?? 0, estimate1RM(set.weight, set.reps));
      b.volume += set.weight * set.reps;
      b.reps += set.reps;
    }
  }
  return keys.map((k) => {
    const b = map.get(k)!;
    return { ...b, volume: Math.round(b.volume) };
  });
}

export interface Change {
  current: number;
  previous: number;
  diff: number;
  pct: number | null; // null when there is nothing to compare against
}

export function change(current: number, previous: number): Change {
  return {
    current,
    previous,
    diff: Math.round((current - previous) * 10) / 10,
    pct: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
  };
}

/** Last non-empty value and the non-empty value before it. */
export function lastTwo(values: (number | null)[]): [number | null, number | null] {
  const present = values.filter((v): v is number => v !== null && v > 0);
  return [present[present.length - 1] ?? null, present[present.length - 2] ?? null];
}

export function firstAndLast(values: (number | null)[]): [number | null, number | null] {
  const present = values.filter((v): v is number => v !== null && v > 0);
  return [present[0] ?? null, present[present.length - 1] ?? null];
}
