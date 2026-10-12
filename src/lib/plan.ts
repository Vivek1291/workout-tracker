import { PlanDay, PlanMode, WorkoutPlan } from '../types';
import { todayKey, WEEKDAYS_SHORT } from './date';
import { newId, nowIso } from './id';

export function blankDay(label: string, isRest = false): PlanDay {
  return { id: newId(), label, isRest, exercises: [] };
}

export function newPlan(mode: PlanMode): WorkoutPlan {
  const now = nowIso();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: mode === 'weekly' ? 'My weekly plan' : 'My rotation',
    mode,
    startDate: todayKey(),
    isActive: false,
    days:
      mode === 'weekly'
        ? WEEKDAYS_SHORT.map((_, i) => blankDay(i >= 5 ? 'Rest' : 'Workout', i >= 5))
        : [blankDay('Push'), blankDay('Pull'), blankDay('Legs'), blankDay('Rest', true)],
  };
}
