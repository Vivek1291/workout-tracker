import { Exercise, PlanDay, PlannedExercise, ProgressionRule, WorkoutPlan } from '../types';
import { newId, nowIso } from '../lib/id';
import { todayKey } from '../lib/date';

/** [exercise name, sets, repMin, repMax, notes?] */
type Item = [string, number, number, number, string?];

interface DayTemplate {
  label: string;
  focus: string;
  items: Item[];
}

/** 6-day Push / Pull / Legs split, Monday → Saturday. Sunday is rest. */
export const PPL_6_DAY: DayTemplate[] = [
  {
    label: 'Push A + Abs',
    focus: 'Chest • Shoulders • Triceps • Abs',
    items: [
      ['Flat Barbell Bench Press', 3, 8, 10],
      ['Incline Dumbbell Press', 2, 10, 12],
      ['Side Lateral Raise', 3, 12, 15, 'Dumbbell lateral raise'],
      ['Tricep Push-down', 2, 10, 15, 'Rope attachment'],
      ['Reverse Crunch', 3, 10, 15],
      ['Dead Bug', 2, 8, 10, 'Reps per side'],
    ],
  },
  {
    label: 'Pull A + Abs',
    focus: 'Back • Rear delts • Biceps • Abs',
    items: [
      ['Lat Pull-down', 3, 8, 12],
      ['Chest-supported Row', 3, 8, 12],
      ['Reverse Pec Deck', 2, 12, 15],
      ['Dumbbell Curl', 2, 10, 12],
      ['Cable Crunch', 3, 12, 15],
    ],
  },
  {
    label: 'Legs A + Abs',
    focus: 'Quads • Hamstrings • Glutes • Calves',
    items: [
      ['Leg Press', 3, 10, 12],
      ['Seated Leg Curl', 3, 10, 15],
      ['Dumbbell Romanian Deadlift', 2, 10, 12],
      ['Leg Extension', 2, 12, 15],
      ['Standing Calf Raise', 3, 12, 20],
      ['Plank', 3, 20, 40, 'Seconds per set'],
    ],
  },
  {
    label: 'Push B + Abs',
    focus: 'Chest • Shoulders • Triceps • Abs',
    items: [
      ['Incline Chest Press Machine', 3, 8, 12],
      ['Dumbbell Bench Press', 2, 10, 12, 'Flat dumbbell press'],
      ['Cable Lateral Raise', 3, 12, 15],
      ['Overhead Rope Triceps Extension', 2, 10, 15],
      ['Reverse Crunch', 3, 10, 15],
      ['Pallof Press', 2, 10, 12, 'Reps per side'],
    ],
  },
  {
    label: 'Pull B + Abs',
    focus: 'Back • Rear delts • Biceps • Abs',
    items: [
      ['Neutral-grip Lat Pull-down', 3, 8, 12],
      ['Seated Cable Row', 3, 10, 12],
      ['Reverse Pec Deck', 2, 12, 15],
      ['Hammer Curl', 2, 10, 12],
      ['Cable Crunch', 3, 12, 15],
    ],
  },
  {
    label: 'Legs B + Abs',
    focus: 'Quads • Hamstrings • Glutes • Calves',
    items: [
      ['Goblet Squat', 3, 10, 12],
      ['Hip Thrust', 3, 10, 12],
      ['Lying Leg Curl', 3, 10, 15],
      ['Leg Extension', 2, 12, 15],
      ['Seated Calf Raise', 3, 12, 20],
      ['Dead Bug', 2, 8, 10, 'Reps per side'],
    ],
  },
];

export const PPL_PLAN_ID = 'plan-ppl-6-day';

const BIG_LIFTS = /press|squat|row|pull-down|deadlift|thrust/i;

function progressionFor(ex: Exercise, repMin: number, repMax: number): ProgressionRule {
  // Bodyweight core / timed holds: work up through the rep (or seconds) range, no weight to add.
  if (ex.muscleGroup === 'Core' || ex.measure === 'time') return { type: 'double', weightIncrement: 0, repMin, repMax };
  // Double progression: add reps until every set hits the top, then add weight.
  return { type: 'double', weightIncrement: BIG_LIFTS.test(ex.name) ? 2.5 : 1, repMin, repMax };
}

/** Build the 6-day PPL plan, resolving exercise names against the given library. */
export function buildPplPlan(exercises: Exercise[]): WorkoutPlan {
  const byName = new Map(exercises.map((e) => [e.name.toLowerCase(), e]));
  const now = nowIso();
  const days: PlanDay[] = PPL_6_DAY.map((t) => ({
    id: newId(),
    label: t.label,
    isRest: false,
    focus: t.focus,
    exercises: t.items.flatMap(([name, sets, repMin, repMax, notes]): PlannedExercise[] => {
      const ex = byName.get(name.toLowerCase());
      if (!ex) return [];
      return [
        {
          id: newId(),
          exerciseId: ex.id,
          targetSets: sets,
          targetReps: repMin,
          targetWeight: 0,
          progression: progressionFor(ex, repMin, repMax),
          ...(notes ? { notes } : {}),
        },
      ];
    }),
  }));
  days.push({ id: newId(), label: 'Rest', isRest: true, exercises: [] });
  return {
    id: PPL_PLAN_ID,
    createdAt: now,
    updatedAt: now,
    name: '6-day Push / Pull / Legs',
    mode: 'weekly',
    startDate: todayKey(),
    isActive: true,
    days,
  };
}
