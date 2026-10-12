import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { exerciseRegions, Region } from '../lib/muscles';
import { Exercise } from '../types';
import { colors } from './theme';

const NEUTRAL = '#dcdbd6';
const BODY = '#ecebe7';
export const PRIMARY = colors.accent;
export const SECONDARY = '#a9c8ef';

type Fill = (r: Region) => string;

/** Front view, drawn in a 50 × 110 box. */
function Front({ fill }: { fill: Fill }) {
  return (
    <G>
      <Circle cx={25} cy={8} r={6} fill={BODY} />
      <Rect x={22} y={13} width={6} height={4} fill={BODY} />
      <Path d="M19,17 L22,14 L28,14 L31,17 Z" fill={fill('traps')} />
      {/* shoulders: front + side delts */}
      <Ellipse cx={14.5} cy={21} rx={4.5} ry={4} fill={fill('frontDelts')} />
      <Ellipse cx={35.5} cy={21} rx={4.5} ry={4} fill={fill('frontDelts')} />
      <Ellipse cx={11.5} cy={22} rx={2} ry={3.2} fill={fill('sideDelts')} />
      <Ellipse cx={38.5} cy={22} rx={2} ry={3.2} fill={fill('sideDelts')} />
      <Rect x={16.5} y={18} width={8.2} height={10} rx={3} fill={fill('chest')} />
      <Rect x={25.3} y={18} width={8.2} height={10} rx={3} fill={fill('chest')} />
      <Ellipse cx={11} cy={32} rx={3} ry={6} fill={fill('biceps')} />
      <Ellipse cx={39} cy={32} rx={3} ry={6} fill={fill('biceps')} />
      <Ellipse cx={9.2} cy={46} rx={2.6} ry={7} fill={fill('forearms')} />
      <Ellipse cx={40.8} cy={46} rx={2.6} ry={7} fill={fill('forearms')} />
      <Rect x={19.5} y={29.5} width={11} height={17} rx={3} fill={fill('abs')} />
      <Rect x={16.2} y={30} width={2.8} height={15} rx={1.4} fill={fill('obliques')} />
      <Rect x={31} y={30} width={2.8} height={15} rx={1.4} fill={fill('obliques')} />
      <Rect x={17} y={47.5} width={16} height={6} rx={3} fill={BODY} />
      <Ellipse cx={20.3} cy={65} rx={4.5} ry={11} fill={fill('quads')} />
      <Ellipse cx={29.7} cy={65} rx={4.5} ry={11} fill={fill('quads')} />
      <Ellipse cx={20.3} cy={89} rx={3} ry={9} fill={fill('calves')} />
      <Ellipse cx={29.7} cy={89} rx={3} ry={9} fill={fill('calves')} />
    </G>
  );
}

/** Back view, drawn in a 50 × 110 box. */
function Back({ fill }: { fill: Fill }) {
  return (
    <G>
      <Circle cx={25} cy={8} r={6} fill={BODY} />
      <Rect x={22} y={13} width={6} height={4} fill={BODY} />
      <Path d="M18,17 L25,13.5 L32,17 L28.5,25 L25,27 L21.5,25 Z" fill={fill('traps')} />
      <Ellipse cx={14.5} cy={21} rx={4.5} ry={4} fill={fill('rearDelts')} />
      <Ellipse cx={35.5} cy={21} rx={4.5} ry={4} fill={fill('rearDelts')} />
      <Rect x={20} y={26.5} width={10} height={6} rx={2} fill={fill('upperBack')} />
      <Path d="M16.5,24 L20.5,26.5 L21,40 L17,35 Z" fill={fill('lats')} />
      <Path d="M33.5,24 L29.5,26.5 L29,40 L33,35 Z" fill={fill('lats')} />
      <Rect x={21.3} y={34} width={7.4} height={11} rx={2} fill={fill('lowerBack')} />
      <Ellipse cx={11} cy={32} rx={3} ry={6} fill={fill('triceps')} />
      <Ellipse cx={39} cy={32} rx={3} ry={6} fill={fill('triceps')} />
      <Ellipse cx={9.2} cy={46} rx={2.6} ry={7} fill={fill('forearms')} />
      <Ellipse cx={40.8} cy={46} rx={2.6} ry={7} fill={fill('forearms')} />
      <Ellipse cx={20.5} cy={51} rx={4.6} ry={4.6} fill={fill('glutes')} />
      <Ellipse cx={29.5} cy={51} rx={4.6} ry={4.6} fill={fill('glutes')} />
      <Ellipse cx={20.3} cy={67} rx={4.2} ry={9.5} fill={fill('hamstrings')} />
      <Ellipse cx={29.7} cy={67} rx={4.2} ry={9.5} fill={fill('hamstrings')} />
      <Ellipse cx={20.3} cy={88} rx={3.4} ry={8} fill={fill('calves')} />
      <Ellipse cx={29.7} cy={88} rx={3.4} ry={8} fill={fill('calves')} />
    </G>
  );
}

/**
 * Front + back body diagram with the exercise's primary muscles in dark blue
 * and secondary muscles in light blue.
 */
export function MuscleMap({
  exercise,
  size = 56,
  legend = false,
}: {
  exercise: Pick<Exercise, 'muscleGroup' | 'primaryMuscle' | 'secondaryMuscles' | 'name'> | undefined;
  size?: number; // height in px; width is ~0.9 × height
  legend?: boolean;
}) {
  if (!exercise) return <View style={{ width: size * 0.91, height: size }} />;
  const { primary, secondary } = exerciseRegions(exercise);
  const fill: Fill = (r) => (primary.includes(r) ? PRIMARY : secondary.includes(r) ? SECONDARY : NEUTRAL);
  return (
    <View accessibilityLabel={`Muscles worked by ${exercise.name}`}>
      <Svg width={size * 0.91} height={size} viewBox="0 0 100 110">
        <Front fill={fill} />
        <G x={50}>
          <Back fill={fill} />
        </G>
      </Svg>
      {legend ? (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, justifyContent: 'center' }}>
          <LegendDot color={PRIMARY} label="Primary" />
          {secondary.length ? <LegendDot color={SECONDARY} label="Secondary" /> : null}
        </View>
      ) : null}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>{label}</Text>
    </View>
  );
}
