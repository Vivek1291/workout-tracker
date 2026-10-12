/**
 * Core data model.
 *
 * Every persisted record is a plain JSON document with a string `id`
 * and timestamps, so the same shape can live in local storage today
 * and in a MongoDB collection later (use `id` as `_id` or a unique index).
 */

export interface BaseDoc {
  id: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Legs'
  | 'Glutes'
  | 'Core'
  | 'Forearms'
  | 'Cardio'
  | 'Full Body'
  | 'Other';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Glutes',
  'Core',
  'Forearms',
  'Cardio',
  'Full Body',
  'Other',
];

export interface Exercise extends BaseDoc {
  name: string;
  muscleGroup: MuscleGroup;
  primaryMuscle?: string; // e.g. "Upper chest"
  secondaryMuscles?: string; // e.g. "Triceps, front delts"
  /** 'time' = the reps field holds seconds (planks, hangs). */
  measure?: 'reps' | 'time';
  notes?: string;
}

/**
 * How the suggested target for the next session is calculated.
 * - none:    repeat the planned targets
 * - linear:  if every working set hit the target reps last time, add `weightIncrement`
 * - double:  add reps inside [repMin, repMax]; once all sets hit repMax, add weight and drop back to repMin
 * - repeat:  copy exactly what was done last session
 */
export type ProgressionType = 'none' | 'linear' | 'double' | 'repeat';

export interface ProgressionRule {
  type: ProgressionType;
  weightIncrement: number;
  repMin: number;
  repMax: number;
}

export interface PlannedExercise {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  progression: ProgressionRule;
  notes?: string;
}

export interface PlanDay {
  id: string;
  label: string; // e.g. "Push", "Legs", "Rest"
  focus?: string; // e.g. "Chest • Shoulders • Triceps"
  isRest: boolean;
  exercises: PlannedExercise[];
}

/**
 * weekly: `days` always has 7 entries, index 0 = Monday ... 6 = Sunday.
 * cycle:  `days` is an N-day rotation (e.g. Push/Pull/Legs/Rest) that repeats from `startDate`.
 */
export type PlanMode = 'weekly' | 'cycle';

export interface WorkoutPlan extends BaseDoc {
  name: string;
  mode: PlanMode;
  startDate: string; // YYYY-MM-DD, anchor for cycle mode
  days: PlanDay[];
  isActive: boolean;
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export const SET_TYPES: { value: SetType; label: string; short: string }[] = [
  { value: 'normal', label: 'Working', short: 'W' },
  { value: 'warmup', label: 'Warm-up', short: 'WU' },
  { value: 'drop', label: 'Drop set', short: 'D' },
  { value: 'failure', label: 'To failure', short: 'F' },
];

export interface SetLog {
  id: string;
  reps: number;
  weight: number;
  type: SetType;
  completed: boolean;
}

export interface SessionEntry {
  id: string;
  exerciseId: string;
  plannedExerciseId?: string;
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutSession extends BaseDoc {
  date: string; // YYYY-MM-DD (local)
  title: string;
  planId?: string;
  planDayId?: string;
  startedAt: string;
  finishedAt?: string;
  entries: SessionEntry[];
  notes?: string;
}

export interface Settings {
  weightUnit: 'kg' | 'lb';
  storage: 'local' | 'remote';
  remoteUrl: string;
  remoteApiKey: string;
}

export const DEFAULT_SETTINGS: Settings = {
  weightUnit: 'kg',
  storage: 'local',
  remoteUrl: '',
  remoteApiKey: '',
};

/** The full dataset — this is exactly what JSON export/import reads and writes. */
export interface AppData {
  version: 1;
  exercises: Exercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
}

export type CollectionName = 'exercises' | 'plans' | 'sessions';
