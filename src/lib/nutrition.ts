import {
  Activity,
  BodyEntry,
  Food,
  FoodEntry,
  Goal,
  MeasureKey,
  Nutrients,
  Profile,
  PROFILE_ID,
  WaterEntry,
  WorkoutSession,
} from '../types';
import { bucketKey, Period } from './periods';

// ---------- Units ----------

/** Units a food can be logged in: weight/volume units plus its household portions. */
export function unitsFor(food: Food): string[] {
  const base = food.basis === 'ml' ? ['ml', 'l'] : ['g', 'kg'];
  return [...food.portions.map((p) => p.name), ...base];
}

export function gramsFor(food: Food, quantity: number, unit: string): number {
  if (unit === 'g' || unit === 'ml') return quantity;
  if (unit === 'kg' || unit === 'l') return quantity * 1000;
  const portion = food.portions.find((p) => p.name === unit);
  return quantity * (portion?.grams ?? 100);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function nutrientsFor(food: Food, grams: number): Nutrients {
  const f = grams / 100;
  return {
    kcal: Math.round(food.per100.kcal * f),
    protein: r1(food.per100.protein * f),
    carbs: r1(food.per100.carbs * f),
    fat: r1(food.per100.fat * f),
  };
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  const t = items.reduce(
    (a, n) => ({ kcal: a.kcal + n.kcal, protein: a.protein + n.protein, carbs: a.carbs + n.carbs, fat: a.fat + n.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return { kcal: Math.round(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat) };
}

// ---------- Profile & targets ----------

export const ACTIVITY: { value: Activity; label: string; factor: number; help: string }[] = [
  { value: 'sedentary', label: 'Sedentary', factor: 1.2, help: 'Desk job, little exercise' },
  { value: 'light', label: 'Light', factor: 1.375, help: 'Exercise 1–3 days/week' },
  { value: 'moderate', label: 'Moderate', factor: 1.55, help: 'Exercise 3–5 days/week' },
  { value: 'very', label: 'Very active', factor: 1.725, help: 'Hard training 6–7 days/week' },
  { value: 'extra', label: 'Athlete', factor: 1.9, help: 'Twice a day or physical job' },
];

export const GOALS: { value: Goal; label: string; kcalDelta: number; proteinPerKg: number; help: string }[] = [
  { value: 'lose', label: 'Lose fat', kcalDelta: -500, proteinPerKg: 2.0, help: '≈ −0.5 kg per week' },
  { value: 'maintain', label: 'Maintain', kcalDelta: 0, proteinPerKg: 1.6, help: 'Keep your weight' },
  { value: 'gain', label: 'Gain muscle', kcalDelta: 300, proteinPerKg: 1.8, help: '≈ +0.25 kg per week (lean bulk)' },
];

export function defaultProfile(): Profile {
  const now = new Date().toISOString();
  return {
    id: PROFILE_ID,
    createdAt: now,
    updatedAt: now,
    name: '',
    sex: 'male',
    age: 28,
    heightCm: 175,
    weightKg: 70,
    activity: 'moderate',
    goal: 'gain',
    lengthUnit: 'cm',
  };
}

/** Latest logged body weight in kg (body logs use the app's weight unit), falling back to the profile weight. */
export function currentWeightKg(profile: Profile, bodyLogs: BodyEntry[], weightUnit: 'kg' | 'lb'): number {
  const latest = bodyLogs.filter((b) => b.values.weight).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!latest?.values.weight) return profile.weightKg;
  return weightUnit === 'lb' ? Math.round((latest.values.weight / 2.2046) * 10) / 10 : latest.values.weight;
}

export interface Targets extends Nutrients {
  bmr: number;
  tdee: number;
  waterMl: number;
  calculated: { kcal: number; protein: number; waterMl: number };
}

/**
 * Mifflin-St Jeor BMR × activity factor = maintenance (TDEE), then the goal's surplus/deficit.
 * Protein from g per kg; fat 25 % of calories; carbs fill the rest.
 * Water: 35 ml per kg body weight, +500 ml on days with a workout.
 */
export function targets(profile: Profile, weightKg: number, workoutToday = false): Targets {
  const sexAdj = profile.sex === 'male' ? 5 : -161;
  const bmr = Math.round(10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexAdj);
  const factor = ACTIVITY.find((a) => a.value === profile.activity)?.factor ?? 1.55;
  const goal = GOALS.find((g) => g.value === profile.goal) ?? GOALS[1];
  const tdee = Math.round(bmr * factor);
  const calcKcal = Math.max(1200, Math.round((tdee + goal.kcalDelta) / 10) * 10);
  const calcProtein = Math.round(weightKg * goal.proteinPerKg);
  const calcWater = Math.round((weightKg * 35 + (workoutToday ? 500 : 0)) / 50) * 50;

  const kcal = profile.kcalTarget || calcKcal;
  const protein = profile.proteinTarget || calcProtein;
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const waterMl = profile.waterTargetMl ? profile.waterTargetMl + (workoutToday ? 500 : 0) : calcWater;
  return { bmr, tdee, kcal, protein, carbs, fat, waterMl, calculated: { kcal: calcKcal, protein: calcProtein, waterMl: calcWater } };
}

export function workedOutOn(sessions: WorkoutSession[], date: string): boolean {
  return sessions.some((s) => s.date === date);
}

// ---------- Daily & period totals ----------

export function dayFood(foodLogs: FoodEntry[], date: string): FoodEntry[] {
  return foodLogs.filter((f) => f.date === date).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export function dayWaterMl(waterLogs: WaterEntry[], date: string): number {
  return waterLogs.filter((w) => w.date === date).reduce((a, w) => a + w.ml, 0);
}

export interface FoodBucket extends Nutrients {
  key: string;
  daysLogged: number;
  waterMl: number;
  waterDays: number;
  /** Averages per logged day (what the charts show for week/month/year). */
  avg: Nutrients & { waterMl: number };
}

export function foodByPeriod(foodLogs: FoodEntry[], waterLogs: WaterEntry[], period: Period, keys: string[]): FoodBucket[] {
  const days = new Map<string, Set<string>>();
  const waterDays = new Map<string, Set<string>>();
  const sums = new Map<string, Nutrients & { waterMl: number }>(keys.map((k) => [k, { kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0 }]));
  for (const f of foodLogs) {
    const k = bucketKey(f.date, period);
    const s = sums.get(k);
    if (!s) continue;
    s.kcal += f.kcal;
    s.protein += f.protein;
    s.carbs += f.carbs;
    s.fat += f.fat;
    (days.get(k) ?? days.set(k, new Set()).get(k)!).add(f.date);
  }
  for (const w of waterLogs) {
    const k = bucketKey(w.date, period);
    const s = sums.get(k);
    if (!s) continue;
    s.waterMl += w.ml;
    (waterDays.get(k) ?? waterDays.set(k, new Set()).get(k)!).add(w.date);
  }
  return keys.map((k) => {
    const s = sums.get(k)!;
    const d = days.get(k)?.size ?? 0;
    const wd = waterDays.get(k)?.size ?? 0;
    return {
      key: k,
      kcal: Math.round(s.kcal),
      protein: r1(s.protein),
      carbs: r1(s.carbs),
      fat: r1(s.fat),
      waterMl: s.waterMl,
      daysLogged: d,
      waterDays: wd,
      avg: {
        kcal: d ? Math.round(s.kcal / d) : 0,
        protein: d ? r1(s.protein / d) : 0,
        carbs: d ? r1(s.carbs / d) : 0,
        fat: d ? r1(s.fat / d) : 0,
        waterMl: wd ? Math.round(s.waterMl / wd) : 0,
      },
    };
  });
}

/** Latest value of a body measurement within each period (null when not measured). */
export function measureByPeriod(bodyLogs: BodyEntry[], key: MeasureKey, period: Period, keys: string[]): (number | null)[] {
  const latest = new Map<string, { date: string; v: number }>();
  for (const b of bodyLogs) {
    const v = b.values[key];
    if (v === undefined || v === null || !(v > 0)) continue;
    const k = bucketKey(b.date, period);
    const cur = latest.get(k);
    if (!cur || b.date > cur.date) latest.set(k, { date: b.date, v });
  }
  return keys.map((k) => latest.get(k)?.v ?? null);
}

/** Expected weight change from an average daily surplus (≈ 7,700 kcal per kg of body weight). */
export function expectedWeightChangeKg(avgDailyIntake: number, tdee: number, days: number): number {
  return Math.round((((avgDailyIntake - tdee) * days) / 7700) * 100) / 100;
}
