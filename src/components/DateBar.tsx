import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { addDays, formatDate, todayKey } from '../lib/date';
import { colors, space } from './theme';

/** ◀ date ▶ selector; can't go into the future. */
export function DateBar({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = todayKey();
  const isToday = date === today;
  const btn = (label: string, onPress: () => void, disabled = false, a11y: string) => (
    <Pressable accessibilityLabel={a11y} disabled={disabled} onPress={onPress} style={{ paddingHorizontal: space(3), paddingVertical: space(2), opacity: disabled ? 0.3 : 1 }}>
      <Text style={{ fontSize: 18, color: colors.accent, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space(2) }}>
      {btn('‹', () => onChange(addDays(date, -1)), false, 'Previous day')}
      <Pressable onPress={() => onChange(today)}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{isToday ? 'Today' : formatDate(date)}</Text>
        {!isToday ? <Text style={{ fontSize: 11, color: colors.accent, textAlign: 'center' }}>Back to today</Text> : null}
      </Pressable>
      {btn('›', () => onChange(addDays(date, 1)), isToday, 'Next day')}
    </View>
  );
}
