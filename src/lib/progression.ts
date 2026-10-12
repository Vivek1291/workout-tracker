import { PlannedExercise, ProgressionRule, SetLog, WorkoutSession } from '../types';
import { newId } from './id';

export const DEFAULT_PROGRESSION: ProgressionRule = {
  type: 'none',
  weightIncrement: 2.5,
  repMin: 8,
  repMax: 12,
};

export const PROGRESSION_OPTIONS: { value: ProgressionRule['type']; label: string; help: string }[] = [
  { value: 'none', label: 'Fixed', help: 'Always suggest the planned sets × reps × weight.' },
  {
    value: 'linear',
    label: 'Linear overload',
    help: 'Hit every target rep last time → add the weight increment.',
  },
  {
    value: 'double',
    label: 'Double progression',
    help: 'Add reps within the range; once every set hits the top, add weight and restart at the bottom.',
  },
  { value: 'repeat', label: 'Repeat last', help: 'Copy exactly what you did last session.' },
];

export interface Suggestion {
  sets: number;
  reps: number;
  weight: number;
  reason: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Working sets of the most recent finished session that included this exercise. */
export function lastWorkingSets(
  sessions: WorkoutSession[],
  exerciseId: string,
  excludeSessionId?: string,
): SetLog[] | null {
  const sorted = sessions
    .filter((s) => s.id !== excludeSessionId && s.finishedAt)
    .sort((a, b) => (a.date + a.startedAt < b.date + b.startedAt ? 1 : -1));
  for (const s of sorted) {
    const sets = s.entries
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets)
      .filter((set) => set.completed && set.type !== 'warmup');
    if (sets.length > 0) return sets;
  }
  return null;
}

/** Suggest today's target for a planned exercise based on its progression rule and history. */
export function suggestTarget(planned: PlannedExercise, last: SetLog[] | null): Suggestion {
  const rule = planned.progression ?? DEFAULT_PROGRESSION;
  const base: Suggestion = {
    sets: planned.targetSets,
    reps: rule.type === 'double' ? rule.repMin : planned.targetReps,
    weight: planned.targetWeight,
    reason: 'Planned target',
  };
  if (!last || last.length === 0 || rule.type === 'none') {
    return { ...base, reason: last ? 'Planned target' : 'First time — planned target' };
  }

  const lastWeight = Math.max(...last.map((s) => s.weight));
  const topSets = last.filter((s) => s.weight === lastWeight);
  const minReps = Math.min(...topSets.map((s) => s.reps));

  switch (rule.type) {
    case 'repeat':
      return { sets: last.length, reps: minReps, weight: lastWeight, reason: 'Same as last session' };
    case 'linear': {
      const hit = topSets.length >= planned.targetSets && minReps >= planned.targetReps;
      return hit
        ? {
            sets: planned.targetSets,
            reps: planned.targetReps,
            weight: round(lastWeight + rule.weightIncrement),
            reason: `All reps hit last time → +${rule.weightIncrement}`,
          }
        : {
            sets: planned.targetSets,
            reps: planned.targetReps,
            weight: lastWeight,
            reason: 'Missed reps last time → repeat weight',
          };
    }
    case 'double': {
      const allTop = topSets.length >= planned.targetSets && minReps >= rule.repMax;
      if (allTop) {
        return {
          sets: planned.targetSets,
          reps: rule.repMin,
          weight: round(lastWeight + rule.weightIncrement),
          reason: `Reached ${rule.repMax} reps → +${rule.weightIncrement}, back to ${rule.repMin}`,
        };
      }
      const reps = Math.min(rule.repMax, Math.max(rule.repMin, minReps + 1));
      return {
        sets: planned.targetSets,
        reps,
        weight: lastWeight,
        reason: `Add a rep (range ${rule.repMin}–${rule.repMax})`,
      };
    }
    default:
      return base;
  }
}

export function setsFromSuggestion(s: Suggestion): SetLog[] {
  return Array.from({ length: Math.max(1, s.sets) }, () => ({
    id: newId(),
    reps: s.reps,
    weight: s.weight,
    type: 'normal' as const,
    completed: false,
  }));
}
