import { describe, expect, it } from '@jest/globals';
import { addDays, daysBetween, weekdayIndex } from '../date';
import { newPlan } from '../plan';
import { DEFAULT_PROGRESSION, lastWorkingSets, suggestTarget } from '../progression';
import { planDayForDate } from '../schedule';
import { dailyTotals, estimate1RM, exerciseHistory, summarizeSession } from '../stats';
import { normalizeAppData } from '../../storage/types';
import { PlannedExercise, SetLog, WorkoutSession } from '../../types';

const set = (reps: number, weight: number, extra: Partial<SetLog> = {}): SetLog => ({
  id: Math.random().toString(36),
  reps,
  weight,
  type: 'normal',
  completed: true,
  ...extra,
});

const session = (date: string, exerciseId: string, sets: SetLog[], finished = true): WorkoutSession => ({
  id: `s-${date}-${Math.random()}`,
  createdAt: '',
  updatedAt: '',
  date,
  title: 'T',
  startedAt: `${date}T10:00:00.000Z`,
  finishedAt: finished ? `${date}T11:00:00.000Z` : undefined,
  entries: [{ id: 'e', exerciseId, sets }],
});

const planned = (over: Partial<PlannedExercise> = {}): PlannedExercise => ({
  id: 'pe',
  exerciseId: 'bench',
  targetSets: 3,
  targetReps: 5,
  targetWeight: 60,
  progression: { ...DEFAULT_PROGRESSION },
  ...over,
});

describe('dates', () => {
  it('computes weekdays with Monday = 0', () => {
    expect(weekdayIndex('2026-10-12')).toBe(0); // Monday
    expect(weekdayIndex('2026-10-18')).toBe(6); // Sunday
  });
  it('counts days across month/DST boundaries', () => {
    expect(daysBetween('2026-10-20', '2026-11-05')).toBe(16);
    expect(addDays('2026-03-28', 3)).toBe('2026-03-31');
  });
});

describe('schedule', () => {
  it('maps weekly plans by weekday and repeats every week', () => {
    const plan = newPlan('weekly');
    expect(planDayForDate(plan, '2026-10-12')?.index).toBe(0);
    expect(planDayForDate(plan, '2026-10-19')?.index).toBe(0);
    expect(planDayForDate(plan, '2026-10-17')?.day.isRest).toBe(true);
  });
  it('rotates cycle plans from the start date, including dates before it', () => {
    const plan = { ...newPlan('cycle'), startDate: '2026-10-01' }; // 4-day cycle
    expect(planDayForDate(plan, '2026-10-01')?.index).toBe(0);
    expect(planDayForDate(plan, '2026-10-04')?.index).toBe(3);
    expect(planDayForDate(plan, '2026-10-05')?.index).toBe(0);
    expect(planDayForDate(plan, '2026-09-30')?.index).toBe(3);
  });
});

describe('progression', () => {
  it('suggests the plan when there is no history', () => {
    expect(suggestTarget(planned(), null)).toMatchObject({ sets: 3, reps: 5, weight: 60 });
  });
  it('linear: adds weight only when every target rep was hit', () => {
    const p = planned({ progression: { ...DEFAULT_PROGRESSION, type: 'linear', weightIncrement: 2.5 } });
    expect(suggestTarget(p, [set(5, 60), set(5, 60), set(5, 60)]).weight).toBe(62.5);
    expect(suggestTarget(p, [set(5, 60), set(5, 60), set(4, 60)]).weight).toBe(60);
  });
  it('double: adds reps inside the range, then weight', () => {
    const p = planned({ progression: { type: 'double', weightIncrement: 5, repMin: 8, repMax: 12 } });
    expect(suggestTarget(p, [set(9, 40), set(9, 40), set(8, 40)])).toMatchObject({ reps: 9, weight: 40 });
    expect(suggestTarget(p, [set(12, 40), set(12, 40), set(12, 40)])).toMatchObject({ reps: 8, weight: 45 });
  });
  it('ignores warm-ups, unfinished sessions and incomplete sets for history', () => {
    const sessions = [
      session('2026-10-01', 'bench', [set(10, 20, { type: 'warmup' }), set(5, 60)]),
      session('2026-10-05', 'bench', [set(5, 100)], false),
      session('2026-10-03', 'bench', [set(5, 65), set(5, 70, { completed: false })]),
    ];
    expect(lastWorkingSets(sessions, 'bench')?.map((s) => s.weight)).toEqual([65]);
  });
});

describe('stats', () => {
  it('summarizes volume excluding warm-ups', () => {
    const s = session('2026-10-01', 'bench', [set(10, 20, { type: 'warmup' }), set(5, 60), set(5, 60)]);
    expect(summarizeSession(s)).toEqual({ sets: 2, reps: 10, volume: 600, exercises: 1 });
  });
  it('aggregates per day and per exercise', () => {
    const sessions = [
      session('2026-10-02', 'bench', [set(5, 70)]),
      session('2026-10-01', 'bench', [set(5, 60)]),
      session('2026-10-01', 'squat', [set(5, 100)]),
    ];
    expect(dailyTotals(sessions).map((d) => [d.date, d.volume])).toEqual([
      ['2026-10-01', 800],
      ['2026-10-02', 350],
    ]);
    expect(exerciseHistory(sessions, 'bench').map((p) => p.topWeight)).toEqual([60, 70]);
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 5)).toBe(116.7);
  });
});

describe('import validation', () => {
  it('accepts exported data and strips Mongo _id', () => {
    const out = normalizeAppData({ exercises: [{ _id: 'x', id: 'a', name: 'A' }] });
    expect(out.exercises[0]).toEqual({ id: 'a', name: 'A' });
    expect(out.sessions).toEqual([]);
  });
  it('rejects malformed data', () => {
    expect(() => normalizeAppData({ plans: {} })).toThrow();
    expect(() => normalizeAppData({ sessions: [{}] })).toThrow();
  });
});
