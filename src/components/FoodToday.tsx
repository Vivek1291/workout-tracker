import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '../data/DataProvider';
import { newId, nowIso } from '../lib/id';
import { currentWeightKg, dayFood, dayWaterMl, sumNutrients, targets, workedOutOn } from '../lib/nutrition';
import { formatNumber } from '../lib/stats';
import { Meal, MEALS, WaterEntry } from '../types';
import { WaterBody } from './BodySilhouette';
import { confirm } from './confirm';
import { DateBar } from './DateBar';
import { FoodPicker } from './FoodPicker';
import { CalorieRing, MACRO_COLORS, MacroBar } from './NutritionVisuals';
import { colors, space } from './theme';
import { Button, Card, Muted, NumberInput, Row } from './ui';

const QUICK_WATER = [
  { ml: 250, label: '🥛 Glass', sub: '250 ml' },
  { ml: 500, label: '🍶 Bottle', sub: '500 ml' },
  { ml: 1000, label: '💧 1 L', sub: '1000 ml' },
];

export function FoodToday({ date, onDate }: { date: string; onDate: (d: string) => void }) {
  const { data, profile, settings, saveDoc, removeDoc } = useData();
  const [picker, setPicker] = useState<Meal | null>(null);
  const [customMl, setCustomMl] = useState(300);

  const entries = dayFood(data.foodLogs, date);
  const eaten = sumNutrients(entries);
  const workout = workedOutOn(data.sessions, date);
  const t = targets(profile, currentWeightKg(profile, data.bodyLogs, settings.weightUnit), workout);
  const water = dayWaterMl(data.waterLogs, date);
  const waterPct = t.waterMl ? (water / t.waterMl) * 100 : 0;
  const waterToday = data.waterLogs.filter((w) => w.date === date).sort((a, b) => (a.time < b.time ? 1 : -1));

  const addWater = async (ml: number) => {
    if (ml <= 0) return;
    const now = nowIso();
    const entry: WaterEntry = { id: newId(), createdAt: now, updatedAt: now, date, ml, time: now };
    await saveDoc('waterLogs', entry);
  };

  return (
    <>
      <DateBar date={date} onChange={onDate} />

      {!profile.name ? (
        <Pressable onPress={() => router.push('/profile')}>
          <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>Set up your profile ›</Text>
            <Muted>Add your weight, height, age and goal so your calorie, protein and water targets fit you.</Muted>
          </Card>
        </Pressable>
      ) : null}

      {/* Calories & macros */}
      <Card>
        <Row style={{ alignItems: 'center' }}>
          <CalorieRing eaten={eaten.kcal} target={t.kcal} />
          <View style={{ flex: 1, marginLeft: space(2) }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
              {formatNumber(eaten.kcal)} <Text style={{ fontWeight: '400', color: colors.textSecondary }}>/ {t.kcal} kcal</Text>
            </Text>
            <Muted style={{ marginBottom: space(2) }}>
              Maintenance ≈ {t.tdee} kcal · goal: {profile.goal === 'gain' ? 'gain' : profile.goal === 'lose' ? 'lose' : 'maintain'}
            </Muted>
            <MacroBar label="Protein" value={eaten.protein} target={t.protein} color={MACRO_COLORS.protein} />
            <MacroBar label="Carbs" value={eaten.carbs} target={t.carbs} color={MACRO_COLORS.carbs} />
            <MacroBar label="Fat" value={eaten.fat} target={t.fat} color={MACRO_COLORS.fat} />
          </View>
        </Row>
      </Card>

      {/* Water */}
      <Card>
        <Row style={{ alignItems: 'flex-start' }}>
          <WaterBody percent={waterPct} height={200} />
          <View style={{ flex: 1, marginLeft: space(3) }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Water</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#1f7fc9', fontVariant: ['tabular-nums'] }}>
              {(water / 1000).toFixed(2)} L <Text style={{ fontSize: 13, fontWeight: '400', color: colors.textSecondary }}>/ {(t.waterMl / 1000).toFixed(2)} L</Text>
            </Text>
            <Muted>
              {waterPct >= 100 ? '🎉 Daily requirement met!' : `${formatNumber(Math.max(0, t.waterMl - water))} ml to go`}
              {workout ? ' · +500 ml for your workout' : ''}
            </Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space(2) }}>
              {QUICK_WATER.map((q) => (
                <Pressable
                  key={q.ml}
                  accessibilityLabel={`Add ${q.sub} of water`}
                  onPress={() => addWater(q.ml)}
                  style={({ pressed }) => ({ backgroundColor: '#e3f1fc', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={{ fontWeight: '600', color: '#1f7fc9', fontSize: 13 }}>{q.label}</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>+{q.sub}</Text>
                </Pressable>
              ))}
            </View>
            <Row style={{ marginTop: space(2) }}>
              <NumberInput width={70} decimal={false} value={customMl} onChange={setCustomMl} />
              <Button title="+ ml" small variant="secondary" onPress={() => addWater(customMl)} />
            </Row>
            {waterToday[0] ? (
              <Button title={`Undo last (${waterToday[0].ml} ml)`} small variant="ghost" onPress={() => removeDoc('waterLogs', waterToday[0].id)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
            ) : null}
          </View>
        </Row>
      </Card>

      {/* Meals */}
      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m.value);
        const sum = sumNutrients(items);
        return (
          <Card key={m.value}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {m.icon} {m.label}
              </Text>
              <Muted>{sum.kcal ? `${formatNumber(sum.kcal)} kcal` : ''}</Muted>
            </Row>
            {items.map((e) => (
              <Row key={e.id} style={{ paddingVertical: space(2), borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14 }}>{e.foodName}</Text>
                  <Muted>
                    {formatNumber(e.quantity)} {e.unit} · P {formatNumber(e.protein)}g · C {formatNumber(e.carbs)}g · F {formatNumber(e.fat)}g
                  </Muted>
                </View>
                <Text style={{ color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{formatNumber(e.kcal)}</Text>
                <Pressable
                  accessibilityLabel={`Remove ${e.foodName}`}
                  onPress={async () => {
                    if (await confirm('Remove food?', `${e.foodName} will be removed from ${m.label.toLowerCase()}.`, 'Remove')) removeDoc('foodLogs', e.id);
                  }}
                  style={{ paddingLeft: space(3) }}
                >
                  <Text style={{ color: colors.textMuted }}>✕</Text>
                </Pressable>
              </Row>
            ))}
            <Button title={`+ Add ${m.label.toLowerCase()}`} variant="ghost" small onPress={() => setPicker(m.value)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0, marginTop: space(1) }} />
          </Card>
        );
      })}

      <FoodPicker visible={picker !== null} date={date} meal={picker ?? 'breakfast'} onClose={() => setPicker(null)} />
    </>
  );
}
