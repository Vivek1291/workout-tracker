import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { formatNumber } from '../lib/stats';
import { colors, SVG_FONT } from './theme';

export const MACRO_COLORS = { protein: '#e8564a', carbs: '#eda100', fat: '#6250d6' };

/** Calorie ring: fills clockwise to eaten / target; turns orange when over. */
export function CalorieRing({ eaten, target, size = 150 }: { eaten: number; target: number; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? eaten / target : 0;
  const over = pct > 1;
  const left = Math.round(target - eaten);
  return (
    <Svg width={size} height={size} accessibilityLabel={`${eaten} of ${target} calories`}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bg} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={over ? '#eb6834' : colors.success}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c * Math.min(1, pct)} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <SvgText fontFamily={SVG_FONT} x={size / 2} y={size / 2 - 6} fontSize={24} fontWeight="700" fill={colors.text} textAnchor="middle">
        {formatNumber(Math.abs(left))}
      </SvgText>
      <SvgText fontFamily={SVG_FONT} x={size / 2} y={size / 2 + 14} fontSize={11} fill={colors.textSecondary} textAnchor="middle">
        {left >= 0 ? 'kcal left' : 'kcal over'}
      </SvgText>
    </Svg>
  );
}

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, fontVariant: ['tabular-nums'] }}>
          {formatNumber(value)} / {target} g
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, marginTop: 3, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}
