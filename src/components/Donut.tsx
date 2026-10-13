import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { formatNumber } from '../lib/stats';
import { colors, SVG_FONT } from './theme';

/** Categorical palette (fixed order, never cycled); slices past the 7th fold into "Other". */
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const OTHER = '#8a8984';

export interface Slice {
  key: string;
  label: string;
  value: number;
}

function arc(cx: number, cy: number, r: number, start: number, end: number): string {
  const a0 = start - Math.PI / 2;
  const a1 = end - Math.PI / 2;
  const large = end - start > Math.PI ? 1 : 0;
  return `M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`;
}

/** Donut with a legend that lists every slice's value and share. Tap a slice or legend row to highlight it. */
export function Donut({ slices, unit, centerLabel }: { slices: Slice[]; unit: string; centerLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const positive = slices.filter((s) => s.value > 0);
  const top = positive.slice(0, CATEGORICAL.length);
  const rest = positive.slice(CATEGORICAL.length);
  const shown = rest.length ? [...top, { key: '__other', label: `Other (${rest.length})`, value: rest.reduce((a, s) => a + s.value, 0) }] : top;
  const total = shown.reduce((a, s) => a + s.value, 0);
  const color = (i: number, key: string) => (key === '__other' ? OTHER : CATEGORICAL[i]);

  if (total <= 0) return <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 24 }}>Nothing to show</Text>;

  const size = 180;
  const r = 70;
  const stroke = 26;
  const gap = shown.length > 1 ? 0.02 : 0; // 2px-ish surface gap between slices
  let angle = 0;
  const activeSlice = shown.find((s) => s.key === active);

  return (
    <View>
      <View style={{ alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bg} strokeWidth={stroke} fill="none" />
          {shown.length === 1 ? (
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={color(0, shown[0].key)} strokeWidth={stroke} fill="none" />
          ) : (
            shown.map((s, i) => {
              const sweep = (s.value / total) * Math.PI * 2;
              const d = arc(size / 2, size / 2, r, angle + gap / 2, angle + Math.max(sweep - gap / 2, gap / 2 + 0.001));
              angle += sweep;
              return (
                <Path
                  key={s.key}
                  d={d}
                  stroke={color(i, s.key)}
                  strokeWidth={active === s.key ? stroke + 6 : stroke}
                  fill="none"
                  opacity={active && active !== s.key ? 0.35 : 1}
                  onPress={() => setActive(active === s.key ? null : s.key)}
                />
              );
            })
          )}
          <SvgText fontFamily={SVG_FONT} x={size / 2} y={size / 2 - 4} fontSize={18} fontWeight="700" fill={colors.text} textAnchor="middle">
            {formatNumber(activeSlice ? activeSlice.value : total)}
          </SvgText>
          <SvgText fontFamily={SVG_FONT} x={size / 2} y={size / 2 + 14} fontSize={11} fill={colors.textSecondary} textAnchor="middle">
            {activeSlice ? `${Math.round((activeSlice.value / total) * 100)}% · ${unit}` : `${centerLabel}`}
          </SvgText>
        </Svg>
      </View>
      <View style={{ marginTop: 8 }}>
        {shown.map((s, i) => (
          <Pressable key={s.key} onPress={() => setActive(active === s.key ? null : s.key)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, opacity: active && active !== s.key ? 0.5 : 1 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color(i, s.key), marginRight: 8 }} />
              <Text style={{ flex: 1, color: colors.text, fontSize: 13 }} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] }}>
                {formatNumber(s.value)} {unit} · {Math.round((s.value / total) * 100)}%
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
