import { MeasureKey } from '../types';

export interface MeasureMeta {
  key: MeasureKey;
  label: string;
  kind: 'weight' | 'percent' | 'length';
  help: string;
  /** For waist/stomach/body fat a decrease is usually the goal. */
  lowerIsBetter?: boolean;
}

export const MEASURES: MeasureMeta[] = [
  { key: 'weight', label: 'Body weight', kind: 'weight', help: 'Morning, after the bathroom, before eating' },
  { key: 'bodyFat', label: 'Body fat', kind: 'percent', help: 'From a smart scale or calipers', lowerIsBetter: true },
  { key: 'chest', label: 'Chest', kind: 'length', help: 'Around the nipples, arms relaxed' },
  { key: 'shoulders', label: 'Shoulders', kind: 'length', help: 'Widest point around both shoulders' },
  { key: 'biceps', label: 'Biceps', kind: 'length', help: 'Flexed, at the peak' },
  { key: 'forearm', label: 'Forearm', kind: 'length', help: 'Widest point' },
  { key: 'neck', label: 'Neck', kind: 'length', help: 'Just below the Adam’s apple' },
  { key: 'waist', label: 'Waist', kind: 'length', help: 'Narrowest point, above the belly button', lowerIsBetter: true },
  { key: 'stomach', label: 'Stomach', kind: 'length', help: 'Around the belly button, relaxed', lowerIsBetter: true },
  { key: 'hips', label: 'Hips', kind: 'length', help: 'Widest point of the glutes' },
  { key: 'thigh', label: 'Thigh', kind: 'length', help: 'Widest point, below the glutes' },
  { key: 'calf', label: 'Calf', kind: 'length', help: 'Widest point' },
];

export function measureUnit(meta: MeasureMeta, weightUnit: string, lengthUnit: string): string {
  return meta.kind === 'weight' ? weightUnit : meta.kind === 'percent' ? '%' : lengthUnit;
}
