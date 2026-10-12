import { Exercise, MuscleGroup } from '../types';
import { newId, nowIso } from '../lib/id';

const DEFAULTS: [string, MuscleGroup][] = [
  ['Bench Press', 'Chest'],
  ['Incline Dumbbell Press', 'Chest'],
  ['Chest Fly', 'Chest'],
  ['Deadlift', 'Back'],
  ['Pull-up', 'Back'],
  ['Barbell Row', 'Back'],
  ['Lat Pulldown', 'Back'],
  ['Overhead Press', 'Shoulders'],
  ['Lateral Raise', 'Shoulders'],
  ['Barbell Curl', 'Biceps'],
  ['Hammer Curl', 'Biceps'],
  ['Triceps Pushdown', 'Triceps'],
  ['Skull Crusher', 'Triceps'],
  ['Back Squat', 'Legs'],
  ['Leg Press', 'Legs'],
  ['Romanian Deadlift', 'Legs'],
  ['Leg Curl', 'Legs'],
  ['Calf Raise', 'Legs'],
  ['Hip Thrust', 'Glutes'],
  ['Plank', 'Core'],
  ['Hanging Leg Raise', 'Core'],
];

export function defaultExercises(): Exercise[] {
  const now = nowIso();
  return DEFAULTS.map(([name, muscleGroup]) => ({ id: newId(), name, muscleGroup, createdAt: now, updatedAt: now }));
}
