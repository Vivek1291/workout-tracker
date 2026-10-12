import { PlanDay, WorkoutPlan, WorkoutSession } from '../types';
import { newId, nowIso } from './id';
import { lastWorkingSets, setsFromSuggestion, suggestTarget } from './progression';

/** Build a new session, pre-filled from a plan day with progression-adjusted targets. */
export function createSession(opts: {
  date: string;
  sessions: WorkoutSession[];
  plan?: WorkoutPlan;
  day?: PlanDay;
  title?: string;
}): WorkoutSession {
  const now = nowIso();
  const entries = (opts.day?.isRest ? [] : (opts.day?.exercises ?? [])).map((pe) => ({
    id: newId(),
    exerciseId: pe.exerciseId,
    plannedExerciseId: pe.id,
    sets: setsFromSuggestion(suggestTarget(pe, lastWorkingSets(opts.sessions, pe.exerciseId))),
  }));
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    date: opts.date,
    title: opts.title ?? (opts.day ? opts.day.label || 'Workout' : 'Workout'),
    planId: opts.plan?.id,
    planDayId: opts.day?.id,
    startedAt: now,
    entries,
  };
}
