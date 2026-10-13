import React, { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { formatNumber } from '../lib/stats';
import { SET_TYPES, SetLog } from '../types';
import { colors, SVG_FONT, svgPress } from './theme';

const HEIGHT = 150;
const PAD = { top: 22, bottom: 34, left: 4, right: 4 };
const WARMUP = '#a9c8ef';

/** Short x label per set: WU1, S1, S2, D1, F1… */
function labels(sets: SetLog[]): string[] {
  const counters: Record<string, number> = {};
  return sets.map((s) => {
    const prefix = s.type === 'warmup' ? 'WU' : s.type === 'drop' ? 'D' : s.type === 'failure' ? 'F' : 'S';
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    return `${prefix}${counters[prefix]}`;
  });
}

/**
 * Set-by-set bars for one exercise in one session: bar height = weight,
 * weight on top, reps below. Bodyweight/timed exercises plot reps (or seconds) instead.
 */
export function SetChart({ sets, unit, timed = false, compact = false }: { sets: SetLog[]; unit: string; timed?: boolean; compact?: boolean }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const shown = sets.filter((s) => s.reps > 0 || s.weight > 0);
  if (shown.length === 0) return null;

  const byWeight = shown.some((s) => s.weight > 0);
  const value = (s: SetLog) => (byWeight ? s.weight : s.reps);
  const max = Math.max(...shown.map(value), 1);
  const names = labels(shown);
  const height = compact ? 120 : HEIGHT;
  const plotH = height - PAD.top - PAD.bottom;
  const slot = (width - PAD.left - PAD.right) / shown.length;
  const barW = Math.max(8, Math.min(36, slot - 8));
  const repsUnit = timed ? 's' : '';

  const sel = active !== null ? shown[active] : null;
  const selMeta = sel ? SET_TYPES.find((t) => t.value === sel.type) : null;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>
        {sel
          ? `${names[active!]} · ${selMeta?.label}: ${sel.reps}${timed ? ' s' : ' reps'}${sel.weight ? ` × ${sel.weight} ${unit}` : ''}`
          : `Set by set — ${byWeight ? `weight (${unit}) on top, ${timed ? 'seconds' : 'reps'} below` : timed ? 'seconds per set' : 'reps per set'}`}
      </Text>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={colors.border} strokeWidth={1} />
          {shown.map((s, i) => {
            const v = value(s);
            const h = Math.max(2, (v / max) * plotH);
            const x = PAD.left + slot * i + (slot - barW) / 2;
            const y = PAD.top + plotH - h;
            const r = Math.min(4, barW / 2, h);
            const d = `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`;
            const cx = x + barW / 2;
            const isWarm = s.type === 'warmup';
            return (
              <React.Fragment key={s.id}>
                <Path d={d} fill={isWarm ? WARMUP : colors.accent} stroke={i === active ? colors.text : 'none'} strokeWidth={1.5} />
                <SvgText fontFamily={SVG_FONT} x={cx} y={y - 5} fontSize={10} fontWeight="600" fill={colors.text} textAnchor="middle">
                  {byWeight ? formatNumber(s.weight) : `${s.reps}${repsUnit}`}
                </SvgText>
                <SvgText fontFamily={SVG_FONT} x={cx} y={height - 20} fontSize={10} fill={colors.textSecondary} textAnchor="middle">
                  {byWeight ? `×${s.reps}${repsUnit}` : ''}
                </SvgText>
                <SvgText fontFamily={SVG_FONT} x={cx} y={height - 6} fontSize={10} fontWeight="600" fill={isWarm ? colors.textMuted : colors.textSecondary} textAnchor="middle">
                  {names[i]}
                </SvgText>
                <Rect x={PAD.left + slot * i} y={0} width={slot} height={height} fill="transparent" {...svgPress(() => setActive(i === active ? null : i))} />
              </React.Fragment>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}
