import { AppData, Exercise } from '../types';
import { nowIso } from '../lib/id';
import { LIBRARY, libraryExercise, RENAMES } from './library';
import { buildPplPlan, PPL_PLAN_ID } from './templates';

/**
 * Bump when built-in content changes. Each step runs once per device:
 *   1 → original starter exercises
 *   2 → full exercise library + 6-day Push/Pull/Legs plan (made active)
 */
export const DATA_VERSION = 2;

export function upgradeData(input: AppData, fromVersion: number): AppData {
  let data: AppData = JSON.parse(JSON.stringify(input));
  if (fromVersion < 2) data = addLibraryAndPpl(data);
  return data;
}

function addLibraryAndPpl(data: AppData): AppData {
  const now = nowIso();
  const byName = new Map(data.exercises.map((e) => [e.name.toLowerCase(), e]));

  // Rename old starter exercises so their history carries over.
  for (const [oldName, newName] of Object.entries(RENAMES)) {
    const old = byName.get(oldName.toLowerCase());
    if (old && !byName.has(newName.toLowerCase())) {
      old.name = newName;
      old.updatedAt = now;
      byName.delete(oldName.toLowerCase());
      byName.set(newName.toLowerCase(), old);
    }
  }

  // Add missing library exercises; fill muscle details on ones that already exist.
  for (const row of LIBRARY) {
    const lib = libraryExercise(row);
    const existing = byName.get(lib.name.toLowerCase());
    if (existing) {
      const merged: Exercise = {
        ...existing,
        muscleGroup: lib.muscleGroup,
        primaryMuscle: existing.primaryMuscle ?? lib.primaryMuscle,
        secondaryMuscles: existing.secondaryMuscles ?? lib.secondaryMuscles,
        measure: existing.measure ?? lib.measure,
        updatedAt: now,
      };
      Object.assign(existing, merged);
    } else {
      const id = data.exercises.some((e) => e.id === lib.id) ? `${lib.id}-2` : lib.id;
      const ex = { ...lib, id };
      data.exercises.push(ex);
      byName.set(ex.name.toLowerCase(), ex);
    }
  }

  // Add the PPL plan and make it the active one.
  if (!data.plans.some((p) => p.id === PPL_PLAN_ID)) {
    data.plans = data.plans.map((p) => (p.isActive ? { ...p, isActive: false, updatedAt: now } : p));
    data.plans.push(buildPplPlan(data.exercises));
  }
  return data;
}
