import { Exercise, MuscleGroup, Region } from '../types';

export type { Region };

// Order matters: more specific phrases first.
const KEYWORDS: [RegExp, Region[]][] = [
  [/posterior chain/i, ['hamstrings', 'glutes', 'lowerBack', 'upperBack']],
  [/rear delt/i, ['rearDelts']],
  [/middle delt/i, ['sideDelts']],
  [/front delt/i, ['frontDelts']],
  [/\bdelts?\b|shoulder/i, ['frontDelts', 'sideDelts']],
  [/rotator cuff/i, ['rearDelts']],
  [/trap|neck/i, ['traps']],
  [/brachioradialis|brachialis|forearm|grip|wrist/i, ['forearms']],
  [/bicep/i, ['biceps']],
  // "Long head" / "lateral head" alone are ambiguous (biceps or triceps) → fall back to the group.
  [/tricep/i, ['triceps']],
  [/middle back|upper back|rhomboid/i, ['upperBack']],
  [/lower back/i, ['lowerBack']],
  [/\blats?\b|lat width/i, ['lats']],
  [/chest|pectoral|rib cage/i, ['chest']],
  [/oblique|anti-rotation/i, ['obliques']],
  [/\babs\b|core|deep core/i, ['abs']],
  [/glute/i, ['glutes']],
  [/hamstring/i, ['hamstrings']],
  [/quad/i, ['quads']],
  [/calv|tibialis|soleus|gastrocnemius/i, ['calves']],
];

const GROUP_FALLBACK: Record<MuscleGroup, Region[]> = {
  Chest: ['chest'],
  Back: ['lats', 'upperBack'],
  Shoulders: ['frontDelts', 'sideDelts'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Legs: ['quads', 'hamstrings'],
  Glutes: ['glutes'],
  Core: ['abs'],
  Forearms: ['forearms'],
  Cardio: [],
  'Full Body': ['chest', 'lats', 'quads', 'abs'],
  Other: [],
};

export function regionsFromText(text: string | undefined): Region[] {
  if (!text) return [];
  const found = new Set<Region>();
  // "Front + middle delts" → "front delts, middle delts" before splitting.
  const normalized = text.replace(/front\s*[+&]\s*middle delts?/i, 'front delts, middle delts');
  // Each comma/"+"/"&"-separated part maps on its own so "Triceps, front delts" finds both.
  for (const part of normalized.split(/,|\+|&| and /)) {
    for (const [re, regions] of KEYWORDS) {
      if (re.test(part)) {
        regions.forEach((r) => found.add(r));
        break;
      }
    }
  }
  return [...found];
}

export const REGION_LABELS: Record<Region, string> = {
  chest: 'Chest',
  frontDelts: 'Front delts',
  sideDelts: 'Side delts',
  rearDelts: 'Rear delts',
  traps: 'Traps',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  lats: 'Lats',
  upperBack: 'Upper back',
  lowerBack: 'Lower back',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
};

export const ALL_REGIONS = Object.keys(REGION_LABELS) as Region[];

export type ExerciseMuscles = Pick<Exercise, 'muscleGroup' | 'primaryMuscle' | 'secondaryMuscles' | 'primaryRegions' | 'secondaryRegions'>;

export function exerciseRegions(ex: ExerciseMuscles): {
  primary: Region[];
  secondary: Region[];
} {
  if (ex.primaryRegions?.length || ex.secondaryRegions?.length) {
    const primary = ex.primaryRegions ?? [];
    return { primary, secondary: (ex.secondaryRegions ?? []).filter((r) => !primary.includes(r)) };
  }
  let primary = regionsFromText(ex.primaryMuscle);
  if (primary.length === 0) primary = GROUP_FALLBACK[ex.muscleGroup] ?? [];
  const secondary = regionsFromText(ex.secondaryMuscles).filter((r) => !primary.includes(r));
  return { primary, secondary };
}
