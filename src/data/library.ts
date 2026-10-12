import { Exercise, MuscleGroup } from '../types';
import { nowIso } from '../lib/id';

type Row = [name: string, group: MuscleGroup, primary: string, secondary?: string, measure?: 'time'];

/** Built-in exercise library. Names are the identity used to match existing exercises. */
export const LIBRARY: Row[] = [
  // Chest
  ['Flat Barbell Bench Press', 'Chest', 'Middle chest (pectoralis major)', 'Triceps, front delts'],
  ['Incline Bench Press', 'Chest', 'Upper chest', 'Triceps, front delts'],
  ['Decline Bench Press', 'Chest', 'Lower chest', 'Triceps'],
  ['Incline Dumbbell Press', 'Chest', 'Upper chest', 'Front delts'],
  ['Chest Fly', 'Chest', 'Inner chest stretch (machine or dumbbell)', 'Delts (stabilizing)'],
  ['Cable Cross', 'Chest', 'Inner & lower chest', 'Shoulders'],
  ['Push-ups', 'Chest', 'Entire chest', 'Core, triceps'],
  ['Dumbbell Pullover', 'Chest', 'Chest + rib cage expansion', 'Lats'],
  ['Dumbbell Bench Press', 'Chest', 'Middle chest', 'Stabilizers, triceps'],
  ['Incline Chest Press Machine', 'Chest', 'Upper chest', 'Front delts, triceps'],

  // Back
  ['Pull-ups', 'Back', 'Lats width', 'Biceps, forearms'],
  ['Chin-ups', 'Back', 'Lats + biceps', 'Upper back'],
  ['Lat Pull-down', 'Back', 'Lats width', 'Biceps'],
  ['Close-grip Lat Pull-down', 'Back', 'Lower lats', 'Biceps'],
  ['Neutral-grip Lat Pull-down', 'Back', 'Lats', 'Biceps, brachialis'],
  ['Barbell Row', 'Back', 'Middle back', 'Lats, rear delts'],
  ['Dumbbell Row', 'Back', 'Lats thickness', 'Rhomboids'],
  ['T-bar Row', 'Back', 'Middle back', 'Lats'],
  ['Chest-supported Row', 'Back', 'Middle back', 'Lats, rear delts'],
  ['Seated Cable Row', 'Back', 'Middle back', 'Biceps'],
  ['Face Pull', 'Back', 'Rear delts', 'Traps, rotator cuff'],
  ['Deadlift', 'Back', 'Full posterior chain', 'Traps, core'],

  // Legs
  ['Back Squat', 'Legs', 'Quads + glutes', 'Core'],
  ['Front Squat', 'Legs', 'Quads', 'Upper back'],
  ['Goblet Squat', 'Legs', 'Quads + glutes', 'Core, upper back'],
  ['Leg Press', 'Legs', 'Quads', 'Glutes'],
  ['Walking Lunges', 'Legs', 'Glutes & quads', 'Hamstrings'],
  ['Romanian Deadlift', 'Legs', 'Hamstrings', 'Glutes'],
  ['Dumbbell Romanian Deadlift', 'Legs', 'Hamstrings', 'Glutes'],
  ['Conventional Deadlift', 'Legs', 'Posterior chain', 'Core, grip'],
  ['Leg Extension', 'Legs', 'Quads isolation'],
  ['Leg Curl', 'Legs', 'Hamstrings isolation'],
  ['Seated Leg Curl', 'Legs', 'Hamstrings isolation'],
  ['Lying Leg Curl', 'Legs', 'Hamstrings isolation'],
  ['Hip Thrust', 'Legs', 'Glutes', 'Hamstrings'],
  ['Calf Raises', 'Legs', 'Calves', 'Tibialis'],
  ['Standing Calf Raise', 'Legs', 'Calves (gastrocnemius)'],
  ['Seated Calf Raise', 'Legs', 'Calves (soleus)'],

  // Shoulders
  ['Overhead Barbell Press', 'Shoulders', 'Front + middle delts', 'Triceps'],
  ['Dumbbell Shoulder Press', 'Shoulders', 'Front + middle delts', 'Triceps'],
  ['Side Lateral Raise', 'Shoulders', 'Middle delts', 'Upper traps'],
  ['Cable Lateral Raise', 'Shoulders', 'Middle delts', 'Upper traps'],
  ['Front Raise', 'Shoulders', 'Front delts', 'Upper chest'],
  ['Rear Delt Fly', 'Shoulders', 'Rear delts', 'Upper back'],
  ['Reverse Pec Deck', 'Shoulders', 'Rear delts', 'Upper back'],
  ['Upright Row', 'Shoulders', 'Traps + middle delts', 'Biceps'],
  ['Dumbbell Shrugs', 'Shoulders', 'Traps', 'Neck stabilizers'],
  ['Arnold Press', 'Shoulders', 'Front & middle delts', 'Triceps'],

  // Core / Abs
  ['Plank', 'Core', 'Core stability', undefined, 'time'],
  ['Crunches', 'Core', 'Upper abs'],
  ['Reverse Crunch', 'Core', 'Lower abs'],
  ['Leg Raises', 'Core', 'Lower abs'],
  ['Bicycle Crunch', 'Core', 'Obliques'],
  ['Russian Twist', 'Core', 'Obliques'],
  ['Mountain Climbers', 'Core', 'Core + cardio'],
  ['Hanging Leg Raise', 'Core', 'Lower abs'],
  ['Cable Crunch', 'Core', 'Upper abs'],
  ['Dead Bug', 'Core', 'Deep core stability'],
  ['Pallof Press', 'Core', 'Anti-rotation (obliques)'],

  // Forearms
  ['Wrist Curl', 'Forearms', 'Forearm flexors'],
  ['Reverse Wrist Curl', 'Forearms', 'Forearm extensors'],
  ["Farmer's Walk", 'Forearms', 'Grip strength', undefined, 'time'],
  ['Plate Pinch', 'Forearms', 'Forearm & grip', undefined, 'time'],
  ['Dead Hang', 'Forearms', 'Grip + lats', undefined, 'time'],
  ['Reverse Curl', 'Forearms', 'Brachioradialis', 'Biceps'],

  // Triceps
  ['Close-grip Bench Press', 'Triceps', 'Tricep mass'],
  ['Tricep Push-down', 'Triceps', 'Lateral head'],
  ['Skull Crushers', 'Triceps', 'Long head'],
  ['Overhead DB Extension', 'Triceps', 'Long head'],
  ['Overhead Rope Triceps Extension', 'Triceps', 'Long head'],
  ['Dips', 'Triceps', 'Full tricep'],
  ['Kickbacks', 'Triceps', 'Lateral head (isolation)'],
  ['Rope Extension', 'Triceps', 'Definition'],

  // Biceps
  ['Barbell Curl', 'Biceps', 'Overall biceps mass'],
  ['Dumbbell Curl', 'Biceps', 'Biceps peak'],
  ['Incline Dumbbell Curl', 'Biceps', 'Long head stretch'],
  ['Hammer Curl', 'Biceps', 'Brachialis + forearms'],
  ['Concentration Curl', 'Biceps', 'Biceps peak'],
  ['Preacher Curl', 'Biceps', 'Isolation biceps'],
  ['Cable Curl', 'Biceps', 'Continuous tension'],
];

/**
 * Names used by the first app version, renamed to the library names so
 * existing workout history moves along with them.
 */
export const RENAMES: Record<string, string> = {
  'Bench Press': 'Flat Barbell Bench Press',
  'Pull-up': 'Pull-ups',
  'Lat Pulldown': 'Lat Pull-down',
  'Overhead Press': 'Overhead Barbell Press',
  'Lateral Raise': 'Side Lateral Raise',
  'Triceps Pushdown': 'Tricep Push-down',
  'Skull Crusher': 'Skull Crushers',
  'Calf Raise': 'Calf Raises',
};

const slug = (name: string) =>
  'ex-' +
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function libraryExercise(row: Row): Exercise {
  const [name, muscleGroup, primaryMuscle, secondaryMuscles, measure] = row;
  const now = nowIso();
  return {
    id: slug(name),
    name,
    muscleGroup,
    primaryMuscle,
    ...(secondaryMuscles ? { secondaryMuscles } : {}),
    ...(measure ? { measure } : {}),
    createdAt: now,
    updatedAt: now,
  };
}
