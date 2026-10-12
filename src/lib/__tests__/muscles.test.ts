import { describe, expect, it } from '@jest/globals';
import { exerciseRegions } from '../muscles';
import { LIBRARY, libraryExercise } from '../../data/library';

const regions = (name: string) => {
  const row = LIBRARY.find((r) => r[0] === name)!;
  return exerciseRegions(libraryExercise(row));
};

describe('muscle regions', () => {
  it('maps primary and secondary muscles', () => {
    expect(regions('Flat Barbell Bench Press')).toEqual({ primary: ['chest'], secondary: ['triceps', 'frontDelts'] });
    expect(regions('Overhead Barbell Press').primary).toEqual(['frontDelts', 'sideDelts']);
    expect(regions('Upright Row').primary).toEqual(['traps', 'sideDelts']);
    expect(regions('Face Pull')).toEqual({ primary: ['rearDelts'], secondary: ['traps'] });
    expect(regions('Deadlift').primary).toEqual(['hamstrings', 'glutes', 'lowerBack', 'upperBack']);
  });
  it('falls back to the muscle group for ambiguous descriptions', () => {
    expect(regions('Incline Dumbbell Curl').primary).toEqual(['biceps']);
    expect(regions('Skull Crushers').primary).toEqual(['triceps']);
    expect(regions('Rope Extension').primary).toEqual(['triceps']);
  });
  it('gives every library exercise at least one highlighted region', () => {
    for (const row of LIBRARY) expect(regions(row[0]).primary.length).toBeGreaterThan(0);
  });
});
