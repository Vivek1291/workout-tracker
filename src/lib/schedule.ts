import { PlanDay, WorkoutPlan } from '../types';
import { daysBetween, weekdayIndex } from './date';

/** Which day of a plan falls on a given date. The plan repeats forever. */
export function planDayForDate(plan: WorkoutPlan, dateKey: string): { day: PlanDay; index: number } | null {
  if (plan.days.length === 0) return null;
  let index: number;
  if (plan.mode === 'weekly') {
    index = weekdayIndex(dateKey);
  } else {
    const n = plan.days.length;
    index = ((daysBetween(plan.startDate, dateKey) % n) + n) % n;
  }
  const day = plan.days[index];
  return day ? { day, index } : null;
}

export function dayTitle(plan: WorkoutPlan, index: number): string {
  const day = plan.days[index];
  const label = day?.isRest ? 'Rest' : day?.label || 'Workout';
  return plan.mode === 'weekly' ? label : `Day ${index + 1} · ${label}`;
}
