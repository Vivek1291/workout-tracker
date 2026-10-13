import { describe, expect, it } from '@jest/globals';
import { libraryFoods } from '../../data/foods';
import { defaultProfile, expectedWeightChangeKg, foodByPeriod, gramsFor, measureByPeriod, nutrientsFor, targets, unitsFor } from '../nutrition';

const foods = libraryFoods();
const food = (name: string) => foods.find((f) => f.name === name)!;

describe('nutrition', () => {
  it('converts portions, grams and kg', () => {
    const roti = food('Roti / Chapati');
    expect(unitsFor(roti)).toEqual(['piece', 'g', 'kg']);
    expect(gramsFor(roti, 3, 'piece')).toBe(120);
    expect(nutrientsFor(roti, 120).kcal).toBe(356);
    const rice = food('White rice (cooked)');
    expect(gramsFor(rice, 0.5, 'kg')).toBe(500);
    expect(nutrientsFor(rice, gramsFor(rice, 1, 'bowl'))).toEqual({ kcal: 195, protein: 4.1, carbs: 42, fat: 0.5 });
    expect(unitsFor(food('Milk (toned)'))).toEqual(['glass', 'cup', 'ml', 'l']);
  });

  it('every library food has sane values', () => {
    for (const f of foods) {
      const fromMacros = f.per100.protein * 4 + f.per100.carbs * 4 + f.per100.fat * 9;
      // Stated calories should roughly match the macros (±25 % or ±40 kcal)
      expect(Math.abs(fromMacros - f.per100.kcal)).toBeLessThanOrEqual(Math.max(40, f.per100.kcal * 0.25));
      expect(f.portions.length).toBeGreaterThan(0);
    }
  });

  it('calculates targets with Mifflin-St Jeor', () => {
    const p = { ...defaultProfile(), sex: 'male' as const, age: 30, heightCm: 180, weightKg: 80, activity: 'moderate' as const, goal: 'gain' as const };
    const t = targets(p, 80, false);
    expect(t.bmr).toBe(1780); // 800 + 1125 - 150 + 5
    expect(t.tdee).toBe(2759);
    expect(t.kcal).toBe(3060);
    expect(t.protein).toBe(144);
    expect(t.waterMl).toBe(2800);
    expect(targets(p, 80, true).waterMl).toBe(3300);
    expect(targets({ ...p, kcalTarget: 2500 }, 80).kcal).toBe(2500);
  });

  it('averages food per logged day and takes the latest measurement per period', () => {
    const e = (date: string, kcal: number) => ({ id: date + kcal, createdAt: '', updatedAt: '', date, meal: 'lunch' as const, foodId: 'x', foodName: 'x', quantity: 1, unit: 'g', grams: 1, kcal, protein: 0, carbs: 0, fat: 0 });
    const w = (date: string, ml: number) => ({ id: date + ml, createdAt: '', updatedAt: '', date, ml, time: '' });
    const out = foodByPeriod([e('2026-10-12', 2000), e('2026-10-12', 500), e('2026-10-14', 2000)], [w('2026-10-12', 3000)], 'week', ['2026-10-12']);
    expect(out[0]).toMatchObject({ kcal: 4500, daysLogged: 2, avg: { kcal: 2250, waterMl: 3000 } });
    const b = (date: string, weight: number) => ({ id: date, createdAt: '', updatedAt: '', date, values: { weight } });
    expect(measureByPeriod([b('2026-09-03', 70), b('2026-09-28', 71), b('2026-10-02', 71.5)], 'weight', 'month', ['2026-08', '2026-09', '2026-10'])).toEqual([null, 71, 71.5]);
    expect(expectedWeightChangeKg(3000, 2700, 28)).toBe(1.09);
  });
});
