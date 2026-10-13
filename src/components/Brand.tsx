import { Link } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useData } from '../data/DataProvider';
import { colors } from './theme';

/** App mark: a dumbbell in a blue circle. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityLabel="Workout Tracker logo">
      <Circle cx={16} cy={16} r={16} fill={colors.accent} />
      <Rect x={9} y={15} width={14} height={2} rx={1} fill="#fff" />
      <Rect x={6} y={11} width={3.5} height={10} rx={1.5} fill="#fff" />
      <Rect x={22.5} y={11} width={3.5} height={10} rx={1.5} fill="#fff" />
      <Rect x={3.5} y={13} width={2.5} height={6} rx={1} fill="#fff" />
      <Rect x={26} y={13} width={2.5} height={6} rx={1} fill="#fff" />
    </Svg>
  );
}

export function HeaderBrand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, gap: 8 }}>
      <Logo />
    </View>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '🙂';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Round avatar with the user's initials; opens the profile. */
export function ProfileButton() {
  const { profile } = useData();
  return (
    <Link href="/profile" asChild>
      <Pressable accessibilityLabel="Profile" style={{ paddingHorizontal: 6 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent }}>
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>{initials(profile.name)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}
