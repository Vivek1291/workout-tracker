import { describe, expect, it } from '@jest/globals';
import { bucketKey, change, exerciseByPeriod, firstAndLast, overviewByPeriod, recentBuckets } from '../periods';
import { WorkoutSession } from '../../types';

const session = (date: string, weight: number, reps = 5): WorkoutSession => ({
  id: date,
  createdAt: '',
  updatedAt: '',
  date,
  title: 'T',
  startedAt: `${date}T10:00:00.000Z`,
  finishedAt: `${date}T11:00:00.000Z`,
  entries: [{ id: 'e', exerciseId: 'bench', sets: [{ id: 's', reps, weight, type: 'normal', completed: true }] }],
});

describe('periods', () => {
  it('buckets dates by week (Monday), month and year', () => {
    expect(bucketKey('2026-10-18', 'week')).toBe('2026-10-12'); // Sunday → Monday
    expect(bucketKey('2026-10-12', 'week')).toBe('2026-10-12');
    expect(bucketKey('2026-01-01', 'week')).toBe('2025-12-29'); // week spans the new year
    expect(bucketKey('2026-10-18', 'month')).toBe('2026-10');
    expect(bucketKey('2026-10-18', 'year')).toBe('2026');
  });

  it('builds contiguous recent buckets ending today', () => {
    expect(recentBuckets('month', '2026-02-10', []).slice(-3)).toEqual(['2025-12', '2026-01', '2026-02']);
    expect(recentBuckets('week', '2026-10-14', [])).toHaveLength(12);
    expect(recentBuckets('week', '2026-10-14', []).slice(-2)).toEqual(['2026-10-05', '2026-10-12']);
    expect(recentBuckets('year', '2026-10-14', [session('2024-03-01', 50)])).toEqual(['2024', '2025', '2026']);
  });

  it('sums volume per bucket and leaves empty buckets at zero', () => {
    const keys = ['2026-08', '2026-09', '2026-10'];
    const out = overviewByPeriod([session('2026-08-03', 50), session('2026-10-01', 60), session('2026-10-20', 60)], 'month', keys);
    expect(out.map((b) => [b.workouts, b.volume])).toEqual([
      [1, 250],
      [0, 0],
      [2, 600],
    ]);
  });

  it('tracks best weight per bucket and the change across the range', () => {
    const keys = ['2025', '2026'];
    const out = exerciseByPeriod([session('2025-05-01', 60), session('2025-09-01', 70), session('2026-02-01', 80)], 'bench', 'year', keys);
    expect(out.map((b) => b.topWeight)).toEqual([70, 80]);
    const [first, last] = firstAndLast(out.map((b) => b.topWeight));
    expect(change(last!, first!)).toEqual({ current: 80, previous: 70, diff: 10, pct: 14 });
    expect(change(5, 0).pct).toBeNull();
  });
});
