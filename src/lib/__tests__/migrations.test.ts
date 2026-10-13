import { describe, expect, it } from '@jest/globals';
import { upgradeData } from '../../data/migrations';
import { LIBRARY } from '../../data/library';
import { PPL_PLAN_ID } from '../../data/templates';
import { AppData } from '../../types';
import { emptyData } from '../../storage/types';

const empty: AppData = emptyData();

describe('data upgrade', () => {
  it('seeds a fresh install with the library and an active 6-day PPL plan', () => {
    const out = upgradeData(empty, 0);
    expect(out.exercises).toHaveLength(LIBRARY.length);
    const plan = out.plans.find((p) => p.id === PPL_PLAN_ID)!;
    expect(plan.isActive).toBe(true);
    expect(plan.days.map((d) => (d.isRest ? 'Rest' : d.label))).toEqual([
      'Push A + Abs',
      'Pull A + Abs',
      'Legs A + Abs',
      'Push B + Abs',
      'Pull B + Abs',
      'Legs B + Abs',
      'Rest',
    ]);
    expect(plan.days.map((d) => d.exercises.length)).toEqual([6, 5, 6, 6, 5, 6, 0]);
    // every planned exercise resolves to a library exercise
    const ids = new Set(out.exercises.map((e) => e.id));
    for (const d of plan.days) for (const e of d.exercises) expect(ids.has(e.exerciseId)).toBe(true);
    expect(plan.days[0].exercises[0]).toMatchObject({ targetSets: 3, targetReps: 8, progression: { type: 'double', repMin: 8, repMax: 10 } });
  });

  it('renames old starter exercises, keeps their ids and deactivates other plans', () => {
    const old: AppData = {
      ...empty,
      exercises: [{ id: 'old-bench', name: 'Bench Press', muscleGroup: 'Chest', createdAt: '', updatedAt: '' }],
      plans: [{ id: 'mine', name: 'Mine', mode: 'weekly', startDate: '2026-01-01', isActive: true, days: [], createdAt: '', updatedAt: '' }],
    };
    const out = upgradeData(old, 1);
    const bench = out.exercises.filter((e) => e.name === 'Flat Barbell Bench Press');
    expect(bench).toHaveLength(1);
    expect(bench[0].id).toBe('old-bench');
    expect(bench[0].primaryMuscle).toMatch(/chest/i);
    expect(out.plans.find((p) => p.id === 'mine')!.isActive).toBe(false);
    expect(out.plans.find((p) => p.id === PPL_PLAN_ID)!.days[0].exercises[0].exerciseId).toBe('old-bench');
  });

  it('adds the food library and a profile in version 3 without touching workouts', () => {
    const v2 = upgradeData(empty, 2);
    expect(v2.foods.length).toBeGreaterThan(100);
    expect(v2.profile).toHaveLength(1);
    expect(v2.exercises).toHaveLength(0);
    expect(new Set(v2.foods.map((f) => f.id)).size).toBe(v2.foods.length);
  });

  it('does nothing when already up to date', () => {
    expect(upgradeData(empty, 3)).toEqual(empty);
  });
});
