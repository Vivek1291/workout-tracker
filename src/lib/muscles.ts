import { Exercise, MuscleGroup } from '../types';

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

export function exerciseRegions(ex: Pick<Exercise, 'muscleGroup' | 'primaryMuscle' | 'secondaryMuscles'>): {
  primary: Region[];
  secondary: Region[];
} {
  let primary = regionsFromText(ex.primaryMuscle);
  if (primary.length === 0) primary = GROUP_FALLBACK[ex.muscleGroup] ?? [];
  const secondary = regionsFromText(ex.secondaryMuscles).filter((r) => !primary.includes(r));
  return { primary, secondary };
}
