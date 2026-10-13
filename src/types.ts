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

/** Muscle areas drawn on the body diagram. */
export type Region =
  | 'chest'
  | 'frontDelts'
  | 'sideDelts'
  | 'rearDelts'
  | 'traps'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'lats'
  | 'upperBack'
  | 'lowerBack'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export interface Exercise extends BaseDoc {
  name: string;
  muscleGroup: MuscleGroup;
  primaryMuscle?: string; // e.g. "Upper chest"
  secondaryMuscles?: string; // e.g. "Triceps, front delts"
  /** 'time' = the reps field holds seconds (planks, hangs). */
  measure?: 'reps' | 'time';
  notes?: string;
  /** Which picture to show. Defaults to the body diagram. */
  picture?: 'diagram' | 'photo';
  /** Uploaded photo as a small JPEG data URI (kept inside the JSON so it exports/syncs). */
  imageUri?: string;
  /** Muscles picked by hand on the diagram; when set they replace the ones derived from the text. */
  primaryRegions?: Region[];
  secondaryRegions?: Region[];
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

// ---------- Nutrition, water, body ----------

export interface Nutrients {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

export type FoodCategory =
  | 'Grains & breads'
  | 'Dal & legumes'
  | 'Vegetables & curries'
  | 'Dairy & eggs'
  | 'Meat & fish'
  | 'Fruits'
  | 'Nuts & seeds'
  | 'Snacks & sweets'
  | 'Drinks'
  | 'Supplements'
  | 'Other';

export const FOOD_CATEGORIES: FoodCategory[] = [
  'Grains & breads',
  'Dal & legumes',
  'Vegetables & curries',
  'Dairy & eggs',
  'Meat & fish',
  'Fruits',
  'Nuts & seeds',
  'Snacks & sweets',
  'Drinks',
  'Supplements',
  'Other',
];

/** A household portion of a food, e.g. 1 bowl = 150 g, 1 piece = 40 g. */
export interface Portion {
  name: string; // bowl, piece, cup, tbsp, scoop, glass, slice…
  grams: number; // grams (or ml for liquids) in one portion
}

export interface Food extends BaseDoc {
  name: string;
  category: FoodCategory;
  /** Nutrition per 100 g (or per 100 ml when basis is 'ml'). */
  per100: Nutrients;
  basis: 'g' | 'ml';
  portions: Portion[];
  builtIn?: boolean;
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEALS: { value: Meal; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snacks', icon: '🍎' },
];

/** One logged food. Nutrition is stored as eaten, so later edits to the food don't rewrite history. */
export interface FoodEntry extends BaseDoc, Nutrients {
  date: string; // YYYY-MM-DD
  meal: Meal;
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string; // g, kg, ml, l, or a portion name
  grams: number;
}

export interface WaterEntry extends BaseDoc {
  date: string;
  ml: number;
  time: string; // ISO timestamp
}

export type MeasureKey =
  | 'weight'
  | 'bodyFat'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'biceps'
  | 'forearm'
  | 'waist'
  | 'stomach'
  | 'hips'
  | 'thigh'
  | 'calf';

/** All body measurements taken on one date (one document per date). */
export interface BodyEntry extends BaseDoc {
  date: string;
  values: Partial<Record<MeasureKey, number>>;
  notes?: string;
}

export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface Profile extends BaseDoc {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  lengthUnit: 'cm' | 'in';
  /** Manual overrides; when unset the targets are calculated. */
  kcalTarget?: number;
  proteinTarget?: number;
  waterTargetMl?: number;
}

export const PROFILE_ID = 'me';

/** The full dataset — this is exactly what JSON export/import reads and writes. */
export interface AppData {
  version: 1;
  exercises: Exercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  foods: Food[];
  foodLogs: FoodEntry[];
  waterLogs: WaterEntry[];
  bodyLogs: BodyEntry[];
  profile: Profile[];
}

export type CollectionName = 'exercises' | 'plans' | 'sessions' | 'foods' | 'foodLogs' | 'waterLogs' | 'bodyLogs' | 'profile';
