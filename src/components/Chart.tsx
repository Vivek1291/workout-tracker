import React, { useState } from 'react';
import { LayoutChangeEvent, Platform, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { formatShortDate } from '../lib/date';
import { formatNumber } from '../lib/stats';
import { colors } from './theme';

export interface ChartPoint {
  date: string; // YYYY-MM-DD
  value: number;
  detail?: string;
}

const HEIGHT = 200;
const PAD = { top: 16, right: 12, bottom: 28, left: 44 };

function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100);
  if (ticks[ticks.length - 1] < max) ticks.push(Math.round((ticks[ticks.length - 1] + step) * 100) / 100);
  return ticks;
}

/**
 * Single-series chart. Tap (or hover on web) a point/bar to see its value.
 * The chart title outside names the series, so there is no legend.
 */
export function Chart({ points, kind, unit = '' }: { points: ChartPoint[]; kind: 'line' | 'bar'; unit?: string }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length === 0) {
    return (
      <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>No data yet</Text>
      </View>
    );
  }

  const ticks = niceTicks(Math.max(...points.map((p) => p.value)));
  const yMax = ticks[ticks.length - 1] || 1;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const n = points.length;
  const slot = plotW / n;
  const xAt = (i: number) => (kind === 'bar' ? PAD.left + slot * i + slot / 2 : PAD.left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1)));
  const yAt = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  // Show at most ~5 x labels so they never collide.
  const labelEvery = Math.max(1, Math.ceil(n / 5));
  const sel = active ?? n - 1;
  const selPoint = points[sel];

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(' ');
  const barW = Math.max(3, Math.min(28, slot - 2));

  const hoverProps = (i: number) =>
    Platform.OS === 'web'
      ? ({ onPress: () => setActive(i), onMouseEnter: () => setActive(i) } as object)
      : { onPress: () => setActive(i) };

  return (
    <View onLayout={onLayout}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4, minHeight: 22 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
          {formatNumber(selPoint.value)}
          {unit ? ` ${unit}` : ''}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>
          {formatShortDate(selPoint.date)}
          {selPoint.detail ? ` · ${selPoint.detail}` : ''}
        </Text>
      </View>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT} accessibilityLabel={`Chart with ${n} data points`}>
          {ticks.map((t) => (
            <G key={t}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={yAt(t)} y2={yAt(t)} stroke={colors.border} strokeWidth={1} />
              <SvgText x={PAD.left - 6} y={yAt(t) + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
                {formatNumber(t)}
              </SvgText>
            </G>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <SvgText key={`x${i}`} x={xAt(i)} y={HEIGHT - 8} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                {formatShortDate(p.date)}
              </SvgText>
            ) : null,
          )}

          {kind === 'bar'
            ? points.map((p, i) => {
                const h = Math.max(0, yAt(0) - yAt(p.value));
                const x = xAt(i) - barW / 2;
                const y = yAt(p.value);
                const r = Math.min(4, barW / 2, h);
                // Rounded top, square base anchored to the baseline.
                const d = `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`;
                return <Path key={i} d={d} fill={colors.accent} opacity={i === sel ? 1 : 0.55} />;
              })
            : (
                <>
                  <Path d={linePath} stroke={colors.accent} strokeWidth={2} fill="none" strokeLinejoin="round" />
                  {n <= 30 &&
                    points.map((p, i) => (
                      <Circle key={i} cx={xAt(i)} cy={yAt(p.value)} r={3} fill={colors.accent} />
                    ))}
                  <Line x1={xAt(sel)} x2={xAt(sel)} y1={PAD.top} y2={PAD.top + plotH} stroke={colors.textMuted} strokeWidth={1} strokeDasharray="3,3" />
                  <Circle cx={xAt(sel)} cy={yAt(selPoint.value)} r={5} fill={colors.accent} stroke={colors.surface} strokeWidth={2} />
                </>
              )}

          {/* Invisible full-height hit targets, wider than the marks. */}
          {points.map((_, i) => (
            <Rect
              key={`hit${i}`}
              x={kind === 'bar' ? PAD.left + slot * i : xAt(i) - Math.max(slot, 12) / 2}
              y={PAD.top}
              width={Math.max(slot, 12)}
              height={plotH}
              fill="transparent"
              {...hoverProps(i)}
            />
          ))}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
    </View>
  );
}
