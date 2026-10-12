import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { formatNumber } from '../lib/stats';
import { colors } from './theme';

export interface ChartPoint {
  label: string; // short x-axis label
  title: string; // long label shown for the selected point
  value: number | null; // null = no data (gap in a line, empty bar)
  detail?: string;
}

const HEIGHT = 210;
const PAD = { top: 14, right: 12, bottom: 28, left: 44 };

function niceTicks(min: number, max: number): number[] {
  if (max <= min) max = min + 1;
  const raw = (max - min) / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v < max + step * 0.999; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/**
 * Single-series chart. Tap (or hover on web) a point/bar to read its value;
 * the most recent point is selected by default. The card title names the series.
 */
export function Chart({ points, kind, unit = '' }: { points: ChartPoint[]; kind: 'line' | 'bar'; unit?: string }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  // Reset the selection when the data set changes (new period / metric / exercise).
  const signature = points.map((p) => p.label).join('|');
  useEffect(() => setActive(null), [signature]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const present = points.map((p, i) => ({ p, i })).filter(({ p }) => p.value !== null && (kind === 'line' || p.value > 0));
  if (present.length === 0) {
    return (
      <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>No data in this period yet.{'\n'}Finish a workout to see it here.</Text>
      </View>
    );
  }

  const values = present.map(({ p }) => p.value as number);
  const dataMax = Math.max(...values);
  // Bars start at zero; lines zoom in on the data so strength gains are visible.
  const dataMin = kind === 'bar' ? 0 : Math.max(0, Math.min(...values) - (dataMax - Math.min(...values)) * 0.25 - 1);
  const ticks = niceTicks(kind === 'bar' ? 0 : dataMin, dataMax);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1] || 1;

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const n = points.length;
  const slot = plotW / n;
  const xAt = (i: number) => PAD.left + slot * i + slot / 2;
  const yAt = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const lastPresent = present[present.length - 1].i;
  const sel = active !== null && points[active] ? active : lastPresent;
  const selPoint = points[sel];

  // Thin the x labels so they never collide (~1 label per 48px).
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 48))));

  // Line path with gaps where there is no data.
  let linePath = '';
  let penDown = false;
  points.forEach((p, i) => {
    if (p.value === null) {
      penDown = false;
      return;
    }
    linePath += `${penDown ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)} `;
    penDown = true;
  });
  // Dotted connector across gaps so the overall trend is still readable.
  const trendPath = present.map(({ p, i }, k) => `${k === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.value as number).toFixed(1)}`).join(' ');

  const barW = Math.max(3, Math.min(28, slot - 4));

  const hoverProps = (i: number) =>
    Platform.OS === 'web' ? ({ onPress: () => setActive(i), onMouseEnter: () => setActive(i) } as object) : { onPress: () => setActive(i) };

  return (
    <View onLayout={onLayout}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 6, minHeight: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
          {selPoint.value === null ? '—' : formatNumber(selPoint.value)}
          {unit && selPoint.value !== null ? <Text style={{ fontSize: 14, fontWeight: '500' }}> {unit}</Text> : null}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>
          {selPoint.title}
          {selPoint.detail ? ` · ${selPoint.detail}` : ''}
        </Text>
      </View>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {ticks.map((t) => (
            <G key={t}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={yAt(t)} y2={yAt(t)} stroke={colors.border} strokeWidth={1} />
              <SvgText x={PAD.left - 6} y={yAt(t) + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
                {formatNumber(t)}
              </SvgText>
            </G>
          ))}
          {points.map((p, i) =>
            (n - 1 - i) % labelEvery === 0 ? (
              <SvgText key={`x${i}`} x={xAt(i)} y={HEIGHT - 8} fontSize={10} fill={i === sel ? colors.text : colors.textMuted} textAnchor="middle">
                {p.label}
              </SvgText>
            ) : null,
          )}

          {kind === 'bar' ? (
            points.map((p, i) => {
              if (!p.value) return null;
              const h = Math.max(1, yAt(yMin) - yAt(p.value));
              const x = xAt(i) - barW / 2;
              const y = yAt(yMin) - h;
              const r = Math.min(4, barW / 2, h);
              const d = `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`;
              return <Path key={i} d={d} fill={colors.accent} opacity={i === sel ? 1 : 0.45} />;
            })
          ) : (
            <>
              <Path d={trendPath} stroke={colors.accent} strokeWidth={1} strokeDasharray="2,4" fill="none" opacity={0.6} />
              <Path d={linePath} stroke={colors.accent} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {present.map(({ p, i }) => (
                <Circle key={i} cx={xAt(i)} cy={yAt(p.value as number)} r={3.5} fill={colors.accent} />
              ))}
              <Line x1={xAt(sel)} x2={xAt(sel)} y1={PAD.top} y2={PAD.top + plotH} stroke={colors.textMuted} strokeWidth={1} strokeDasharray="3,3" />
              {selPoint.value !== null ? (
                <Circle cx={xAt(sel)} cy={yAt(selPoint.value)} r={6} fill={colors.accent} stroke={colors.surface} strokeWidth={2} />
              ) : null}
            </>
          )}

          {/* Invisible full-height hit targets, wider than the marks. */}
          {points.map((_, i) => (
            <Rect key={`hit${i}`} x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH} fill="transparent" {...hoverProps(i)} />
          ))}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
    </View>
  );
}
