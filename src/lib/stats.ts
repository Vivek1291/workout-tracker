import { SetLog, WorkoutSession } from '../types';

/** Sets that count toward stats: completed and not warm-ups. */
export function countedSets(sets: SetLog[]): SetLog[] {
  return sets.filter((s) => s.completed && s.type !== 'warmup');
}

/** Epley estimated one-rep max. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export interface SessionSummary {
  sets: number;
  reps: number;
  volume: number; // Σ reps × weight
  exercises: number;
}

export function summarizeSession(session: WorkoutSession): SessionSummary {
  let sets = 0;
  let reps = 0;
  let volume = 0;
  let exercises = 0;
  for (const entry of session.entries) {
    const counted = countedSets(entry.sets);
    if (counted.length > 0) exercises++;
    for (const s of counted) {
      sets++;
      reps += s.reps;
      volume += s.reps * s.weight;
    }
  }
  return { sets, reps, volume: Math.round(volume), exercises };
}

export interface DailyPoint {
  date: string;
  sets: number;
  reps: number;
  volume: number;
  sessions: number;
}

/** One point per calendar day that has at least one session, oldest first. */
export function dailyTotals(sessions: WorkoutSession[]): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>();
  for (const session of sessions) {
    const sum = summarizeSession(session);
    const p = byDate.get(session.date) ?? { date: session.date, sets: 0, reps: 0, volume: 0, sessions: 0 };
    p.sets += sum.sets;
    p.reps += sum.reps;
    p.volume += sum.volume;
    p.sessions += 1;
    byDate.set(session.date, p);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface ExercisePoint {
  date: string;
  sessionId: string;
  topWeight: number;
  topReps: number; // reps done at topWeight (best set)
  best1RM: number;
  volume: number;
  sets: number;
  reps: number;
}

export function exerciseHistory(sessions: WorkoutSession[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const session of sessions) {
    const sets = countedSets(session.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets));
    if (sets.length === 0) continue;
    let topWeight = 0;
    let topReps = 0;
    let best1RM = 0;
    let volume = 0;
    let reps = 0;
    for (const s of sets) {
      if (s.weight > topWeight || (s.weight === topWeight && s.reps > topReps)) {
        topWeight = s.weight;
        topReps = s.reps;
      }
      best1RM = Math.max(best1RM, estimate1RM(s.weight, s.reps));
      volume += s.weight * s.reps;
      reps += s.reps;
    }
    points.push({
      date: session.date,
      sessionId: session.id,
      topWeight,
      topReps,
      best1RM,
      volume: Math.round(volume),
      sets: sets.length,
      reps,
    });
  }
  return points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export interface ExerciseRecords {
  sessions: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  maxWeight: number;
  best1RM: number;
  maxReps: number;
}

export function exerciseRecords(points: ExercisePoint[], sessions: WorkoutSession[], exerciseId: string): ExerciseRecords {
  let maxReps = 0;
  for (const session of sessions) {
    for (const e of session.entries) {
      if (e.exerciseId !== exerciseId) continue;
      for (const s of countedSets(e.sets)) maxReps = Math.max(maxReps, s.reps);
    }
  }
  return {
    sessions: points.length,
    totalSets: points.reduce((a, p) => a + p.sets, 0),
    totalReps: points.reduce((a, p) => a + p.reps, 0),
    totalVolume: points.reduce((a, p) => a + p.volume, 0),
    maxWeight: points.reduce((a, p) => Math.max(a, p.topWeight), 0),
    best1RM: points.reduce((a, p) => Math.max(a, p.best1RM), 0),
    maxReps,
  };
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 100) / 10}k`;
  return String(Math.round(n * 10) / 10);
}
