import { describe, expect, it } from '@jest/globals';
import { periodDetails } from '../details';
import { SetLog, WorkoutSession } from '../../types';

const set = (reps: number, weight: number, type: SetLog['type'] = 'normal'): SetLog => ({ id: Math.random().toString(36), reps, weight, type, completed: true });
const session = (date: string, entries: [string, SetLog[]][]): WorkoutSession => ({
  id: `s-${date}`,
  createdAt: '',
  updatedAt: '',
  date,
  title: 'Push',
  startedAt: `${date}T10:00:00Z`,
  finishedAt: `${date}T11:00:00Z`,
  entries: entries.map(([exerciseId, sets], i) => ({ id: `e${i}`, exerciseId, sets })),
});

describe('periodDetails', () => {
  const sessions = [
    // week of 5 Oct
    session('2026-10-05', [['bench', [set(20, 30, 'warmup'), set(10, 37), set(10, 37)]]]),
    // week of 12 Oct (skipping a week would also work: previous = latest earlier week with training)
    session('2026-10-12', [
      ['bench', [set(20, 30, 'warmup'), set(10, 37), set(8, 42), set(6, 45)]],
      ['fly', [set(12, 10), set(12, 10)]],
    ]),
  ];

  it('totals working sets only and computes efficiency (volume per set)', () => {
    const d = periodDetails(sessions, 'week', '2026-10-12');
    // 370 + 336 + 270 + 120 + 120 = 1216 over 5 sets
    expect(d.totals).toEqual({ workouts: 1, sets: 5, reps: 48, volume: 1216, efficiency: 243.2 });
    expect(d.previousKey).toBe('2026-10-05');
    expect(d.previous?.volume).toBe(740);
  });

  it('computes power gain (volume %) and strength gain (est. 1RM %)', () => {
    const d = periodDetails(sessions, 'week', '2026-10-12');
    expect(d.powerGainPct).toBe(64.3); // 1216 vs 740
    const bench = d.exercises.find((e) => e.exerciseId === 'bench')!;
    // best 1RM: 45×6 → 54 vs 37×10 → 49.3
    expect(bench.strengthChangePct).toBe(9.5);
    expect(d.exercises.find((e) => e.exerciseId === 'fly')!.strengthChangePct).toBeNull(); // first time
    expect(d.strengthGainPct).toBe(9.5);
  });

  it('keeps warm-ups in the set-by-set list but not in the totals', () => {
    const bench = periodDetails(sessions, 'day', '2026-10-12').exercises.find((e) => e.exerciseId === 'bench')!;
    expect(bench.latest.sets.map((s) => [s.type, s.reps, s.weight])).toEqual([
      ['warmup', 20, 30],
      ['normal', 10, 37],
      ['normal', 8, 42],
      ['normal', 6, 45],
    ]);
    expect(bench.sets).toBe(3);
  });

  it('has no comparison for the first period', () => {
    const d = periodDetails(sessions, 'week', '2026-10-05');
    expect(d.previousKey).toBeNull();
    expect(d.powerGainPct).toBeNull();
  });
});
