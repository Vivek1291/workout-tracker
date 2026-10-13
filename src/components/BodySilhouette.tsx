import React, { useId } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { MeasureKey } from '../types';
import { colors, SVG_FONT } from './theme';

/** Front-view body outline in a 100 × 214 box, as bare shapes (no <g>) because a clipPath only accepts shapes. */
function Shapes({ fill, stroke }: { fill: string; stroke?: string }) {
  const p = { fill, stroke, strokeWidth: stroke ? 1.2 : 0 };
  return (
    <>
      <Circle cx={50} cy={18} r={14} {...p} />
      <Rect x={44} y={29} width={12} height={10} {...p} />
      <Path d="M27,40 Q50,33 73,40 L77,49 L70,100 L72,123 L28,123 L30,100 L23,49 Z" {...p} />
      <Path d="M24,43 L14,60 L9,104 L18,107 L23,67 L29,56 Z" {...p} />
      <Path d="M76,43 L86,60 L91,104 L82,107 L77,67 L71,56 Z" {...p} />
      <Circle cx={13} cy={111} r={5.5} {...p} />
      <Circle cx={87} cy={111} r={5.5} {...p} />
      <Path d="M29,119 L49,119 L48,170 L46,206 L35,206 L32,170 Z" {...p} />
      <Path d="M51,119 L71,119 L68,170 L65,206 L54,206 L52,170 Z" {...p} />
      <Rect x={32} y={203} width={15} height={7} rx={3} {...p} />
      <Rect x={53} y={203} width={15} height={7} rx={3} {...p} />
    </>
  );
}

const WATER = '#3aa0e8';
const WATER_DEEP = '#1f7fc9';

/**
 * Body filled with water from the feet up to `percent` of the daily target.
 * Over 100 % stays full and says so.
 */
export function WaterBody({ percent, height = 220 }: { percent: number; height?: number }) {
  const id = useId().replace(/:/g, '');
  const pct = Math.max(0, Math.min(100, percent));
  const top = 4;
  const bottom = 210;
  const level = bottom - ((bottom - top) * pct) / 100;
  const wave = `M0,${level} Q12.5,${level - 3} 25,${level} T50,${level} T75,${level} T100,${level} L100,214 L0,214 Z`;
  return (
    <View style={{ alignItems: 'center' }} accessibilityLabel={`Water intake ${Math.round(percent)} percent of daily target`}>
      <Svg width={(height * 100) / 214} height={height} viewBox="0 0 100 214">
        <Defs>
          <ClipPath id={`body-${id}`}>
            <Shapes fill="#000" />
          </ClipPath>
        </Defs>
        <Shapes fill="#e8eef4" />
        <G clipPath={`url(#body-${id})`}>
          {pct > 0 ? <Path d={wave} fill={WATER} /> : null}
          {pct > 0 ? <Rect x={0} y={Math.max(level + 6, level)} width={100} height={214} fill={WATER_DEEP} opacity={0.25} /> : null}
        </G>
        <Shapes fill="none" stroke="#9fb3c6" />
        <SvgText fontFamily={SVG_FONT} x={50} y={80} fontSize={15} fontWeight="700" fill={level < 66 ? '#fff' : colors.text} textAnchor="middle">
          {Math.round(percent)}%
        </SvgText>
      </Svg>
    </View>
  );
}

/** Where each measurement is taken, as a line across the silhouette. */
const LINES: Partial<Record<MeasureKey, [number, number, number, number]>> = {
  neck: [42, 33, 58, 33],
  shoulders: [20, 45, 80, 45],
  chest: [25, 58, 75, 58],
  biceps: [11, 64, 25, 64],
  forearm: [9, 88, 20, 88],
  waist: [30, 92, 70, 92],
  stomach: [29, 103, 71, 103],
  hips: [27, 118, 73, 118],
  thigh: [31, 140, 49, 140],
  calf: [33, 182, 48, 182],
};

/** Silhouette showing where to measure; the selected measurement is highlighted. */
export function MeasureGuide({ selected, height = 200 }: { selected: MeasureKey | null; height?: number }) {
  return (
    <View>
      <Svg width={(height * 100) / 214} height={height} viewBox="0 0 100 214">
        <Shapes fill="#eceae6" stroke="#c9c7c1" />
        {(Object.keys(LINES) as MeasureKey[]).map((k) => {
          const [x1, y1, x2, y2] = LINES[k]!;
          const on = k === selected;
          return <Line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? colors.accent : '#b5b3ad'} strokeWidth={on ? 3 : 1} strokeDasharray={on ? undefined : '2,2'} strokeLinecap="round" />;
        })}
      </Svg>
      {selected && !LINES[selected] ? <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>Whole body</Text> : null}
    </View>
  );
}
