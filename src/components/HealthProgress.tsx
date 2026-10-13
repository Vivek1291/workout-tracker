import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../data/DataProvider';
import { formatDate, todayKey } from '../lib/date';
import { MEASURES, measureUnit } from '../lib/measurements';
import {
  currentWeightKg,
  expectedWeightChangeKg,
  foodByPeriod,
  measureByPeriod,
  sumNutrients,
  targets,
} from '../lib/nutrition';
import { bucketKey, bucketLabel, bucketTitle, change, firstAndLast, Period, PERIODS, recentBuckets } from '../lib/periods';
import { formatNumber } from '../lib/stats';
import { MeasureKey, MEALS } from '../types';
import { Chart, ChartPoint } from './Chart';
import { Donut } from './Donut';
import { MACRO_COLORS } from './NutritionVisuals';
import { colors, space } from './theme';
import { Button, Card, Chip, Delta, Empty, Muted, Row, SectionHeader, Segmented, Stat, styles } from './ui';

function KindToggle({ value, onChange }: { value: 'bar' | 'line'; onChange: (k: 'bar' | 'line') => void }) {
  return (
    <Row style={{ gap: 4 }}>
      {(['bar', 'line'] as const).map((k) => (
        <Pressable
          key={k}
          accessibilityRole="button"
          accessibilityLabel={`${k} chart`}
          accessibilityState={{ selected: value === k }}
          onPress={() => onChange(k)}
          style={{ padding: 6, borderRadius: 6, backgroundColor: value === k ? colors.accentSoft : 'transparent' }}
        >
          <Ionicons name={k === 'bar' ? 'bar-chart' : 'analytics'} size={18} color={value === k ? colors.accent : colors.textMuted} />
        </Pressable>
      ))}
    </Row>
  );
}

function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return <Segmented<Period> options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} value={value} onChange={onChange} />;
}

const lastIdx = (vals: (number | null)[]) => {
  for (let i = vals.length - 1; i >= 0; i--) if (vals[i]) return i;
  return null;
};

// ===================== FOOD =====================

type FoodMetric = 'kcal' | 'protein' | 'carbs' | 'fat' | 'water';

export function FoodProgress() {
  const { data, profile, settings } = useData();
  const today = todayKey();
  const [period, setPeriod] = useState<Period>('day');
  const [metric, setMetric] = useState<FoodMetric>('kcal');
  const [kind, setKind] = useState<'bar' | 'line'>('bar');
  const [sel, setSel] = useState<number | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  const weightKg = currentWeightKg(profile, data.bodyLogs, settings.weightUnit);
  const t = targets(profile, weightKg, false);
  const all = useMemo(() => [...data.foodLogs, ...data.waterLogs, ...data.bodyLogs], [data.foodLogs, data.waterLogs, data.bodyLogs]);
  const keys = useMemo(() => recentBuckets(period, today, all), [period, today, all]);
  const buckets = useMemo(() => foodByPeriod(data.foodLogs, data.waterLogs, period, keys), [data.foodLogs, data.waterLogs, period, keys]);
  const weights = useMemo(() => measureByPeriod(data.bodyLogs, 'weight', period, keys), [data.bodyLogs, period, keys]);

  const meta: Record<FoodMetric, { label: string; unit: string; target: number; color?: string }> = {
    kcal: { label: 'Calories', unit: 'kcal', target: t.kcal },
    protein: { label: 'Protein', unit: 'g', target: t.protein },
    carbs: { label: 'Carbs', unit: 'g', target: t.carbs },
    fat: { label: 'Fat', unit: 'g', target: t.fat },
    water: { label: 'Water', unit: 'ml', target: t.waterMl },
  };
  const perDay = period !== 'day';
  const value = (b: (typeof buckets)[number]) => (metric === 'water' ? (b.waterDays ? b.avg.waterMl : null) : b.daysLogged ? b.avg[metric] : null);
  const points: ChartPoint[] = buckets.map((b) => ({
    label: bucketLabel(b.key, period),
    title: bucketTitle(b.key, period),
    value: value(b),
    detail: perDay ? `avg of ${metric === 'water' ? b.waterDays : b.daysLogged} logged day(s)` : undefined,
  }));
  const selIdx = sel ?? lastIdx(points.map((p) => p.value));

  // Energy balance over the visible range.
  const logged = buckets.filter((b) => b.daysLogged > 0);
  const totalDays = logged.reduce((a, b) => a + b.daysLogged, 0);
  const avgIntake = totalDays ? Math.round(logged.reduce((a, b) => a + b.kcal, 0) / totalDays) : 0;
  const daysSpan = period === 'day' ? keys.length : period === 'week' ? keys.length * 7 : period === 'month' ? keys.length * 30 : keys.length * 365;
  const expectedPerWeek = expectedWeightChangeKg(avgIntake, t.tdee, 7);
  const [wFirst, wLast] = firstAndLast(weights);

  const hasData = data.foodLogs.length > 0 || data.waterLogs.length > 0;
  if (!hasData) {
    return <Empty title="No food or water logged yet" body="Log meals and water on Today → Food to see your intake by day, week, month and year." />;
  }

  return (
    <>
      <PeriodPicker
        value={period}
        onChange={(p) => {
          setPeriod(p);
          setSel(null);
        }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(Object.keys(meta) as FoodMetric[]).map((m) => (
          <Chip key={m} label={meta[m].label} selected={metric === m} onPress={() => setMetric(m)} />
        ))}
      </View>
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: space(1) }}>
          <Text style={{ fontWeight: '600', color: colors.textSecondary, flexShrink: 1 }}>
            {meta[metric].label} ({meta[metric].unit}){perDay ? ' — average per day' : ' per day'}
          </Text>
          <KindToggle value={kind} onChange={setKind} />
        </Row>
        <Chart
          points={points}
          kind={kind}
          unit={meta[metric].unit}
          target={meta[metric].target}
          selected={selIdx}
          onSelect={setSel}
          onPressPoint={(i) => setDetails(buckets[i].key)}
        />
        {selIdx !== null ? (
          <Button title={`See details: ${bucketTitle(buckets[selIdx].key, period)}`} variant="secondary" small onPress={() => setDetails(buckets[selIdx].key)} style={{ marginTop: space(2) }} />
        ) : null}
        <Muted style={{ marginTop: space(1) }}>Dashed green line = your daily target. Tap a {kind === 'bar' ? 'bar' : 'point'} for the meal-by-meal breakdown.</Muted>
      </Card>

      <SectionHeader>Calories & weight</SectionHeader>
      <Card>
        <Row>
          <Stat label="Avg intake / day" value={`${formatNumber(avgIntake)}`} />
          <Stat label="Target / day" value={`${t.kcal}`} />
          <Stat label="Maintenance" value={`${t.tdee}`} />
        </Row>
        <Muted style={{ textAlign: 'center' }}>
          {totalDays
            ? `${avgIntake >= t.tdee ? 'Surplus' : 'Deficit'} of ${formatNumber(Math.abs(avgIntake - t.tdee))} kcal/day → expected ${expectedPerWeek >= 0 ? '+' : ''}${expectedPerWeek} kg per week (≈7,700 kcal = 1 kg).`
            : 'Log food to estimate your weight change.'}
        </Muted>
        {wFirst !== null && wLast !== null ? (
          <Row style={{ justifyContent: 'center', marginTop: space(2) }}>
            <Muted>
              Actual weight in this range: {formatNumber(wFirst)} → {formatNumber(wLast)} {settings.weightUnit}
            </Muted>
            <Delta diff={Math.round((wLast - wFirst) * 10) / 10} pct={null} unit={settings.weightUnit} higherIsBetter={profile.goal !== 'lose'} compact />
          </Row>
        ) : (
          <Muted style={{ textAlign: 'center', marginTop: space(2) }}>Log your body weight on Today → Body to compare with the estimate.</Muted>
        )}
      </Card>
      <Card>
        <Text style={{ fontWeight: '600', color: colors.textSecondary, marginBottom: space(1) }}>Body weight ({settings.weightUnit})</Text>
        <Chart
          points={buckets.map((b, i) => ({ label: bucketLabel(b.key, period), title: bucketTitle(b.key, period), value: weights[i] }))}
          kind="line"
          unit={settings.weightUnit}
        />
        <Muted>Covering {daysSpan} days. Weight is the latest weigh-in of each {PERIODS.find((p) => p.value === period)?.noun}.</Muted>
      </Card>

      <FoodDetailsSheet period={period} bucket={details} onClose={() => setDetails(null)} />
    </>
  );
}

function FoodDetailsSheet({ period, bucket, onClose }: { period: Period; bucket: string | null; onClose: () => void }) {
  const { data, profile, settings } = useData();
  const [split, setSplit] = useState<'macros' | 'foods' | 'meals'>('macros');
  const entries = useMemo(() => (bucket ? data.foodLogs.filter((f) => bucketKey(f.date, period) === bucket) : []), [data.foodLogs, period, bucket]);
  const water = bucket ? data.waterLogs.filter((w) => bucketKey(w.date, period) === bucket).reduce((a, w) => a + w.ml, 0) : 0;
  const days = new Set(entries.map((e) => e.date)).size || 1;
  const total = sumNutrients(entries);
  const t = targets(profile, currentWeightKg(profile, data.bodyLogs, settings.weightUnit), false);

  const byFood = new Map<string, { label: string; kcal: number; grams: number; count: number }>();
  for (const e of entries) {
    const cur = byFood.get(e.foodName) ?? { label: e.foodName, kcal: 0, grams: 0, count: 0 };
    cur.kcal += e.kcal;
    cur.grams += e.grams;
    cur.count += 1;
    byFood.set(e.foodName, cur);
  }
  const foods = [...byFood.values()].sort((a, b) => b.kcal - a.kcal);
  const slices =
    split === 'macros'
      ? [
          { key: 'protein', label: `Protein ${formatNumber(total.protein)} g`, value: Math.round(total.protein * 4), color: MACRO_COLORS.protein },
          { key: 'carbs', label: `Carbs ${formatNumber(total.carbs)} g`, value: Math.round(total.carbs * 4), color: MACRO_COLORS.carbs },
          { key: 'fat', label: `Fat ${formatNumber(total.fat)} g`, value: Math.round(total.fat * 9), color: MACRO_COLORS.fat },
        ]
      : split === 'foods'
        ? foods.map((f) => ({ key: f.label, label: f.label, value: Math.round(f.kcal) }))
        : MEALS.map((m) => ({ key: m.value, label: `${m.icon} ${m.label}`, value: Math.round(entries.filter((e) => e.meal === m.value).reduce((a, e) => a + e.kcal, 0)) }));

  return (
    <Modal visible={!!bucket} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {bucket ? (
          <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(16), width: '100%', maxWidth: 760, alignSelf: 'center' }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
              <Text style={[styles.title, { flexShrink: 1 }]}>{bucketTitle(bucket, period)}</Text>
              <Button title="Close" variant="ghost" small onPress={onClose} />
            </Row>
            <Card>
              <Row>
                <Stat label={period === 'day' ? 'Calories' : 'Avg kcal / day'} value={formatNumber(Math.round(total.kcal / days))} />
                <Stat label="Protein / day" value={`${formatNumber(Math.round(total.protein / days))} g`} />
                <Stat label="Water" value={`${(water / 1000 / (period === 'day' ? 1 : days)).toFixed(1)} L`} />
              </Row>
              <Muted style={{ textAlign: 'center' }}>
                Target {t.kcal} kcal · {t.protein} g protein · {(t.waterMl / 1000).toFixed(1)} L water
                {period !== 'day' ? ` · ${days} day(s) logged` : ''}
              </Muted>
            </Card>
            <Card>
              <Segmented<'macros' | 'foods' | 'meals'>
                options={[
                  { value: 'macros', label: 'Macros' },
                  { value: 'foods', label: 'Foods' },
                  { value: 'meals', label: 'Meals' },
                ]}
                value={split}
                onChange={setSplit}
              />
              <Donut slices={slices} unit="kcal" centerLabel="kcal total" />
              {split === 'macros' ? (
                <Muted style={{ marginTop: space(2) }}>
                  Calories from each macro: protein & carbs 4 kcal/g, fat 9 kcal/g.
                </Muted>
              ) : null}
            </Card>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginVertical: space(2) }}>{period === 'day' ? 'Everything you ate' : 'Most eaten foods'}</Text>
            {period === 'day'
              ? MEALS.map((m) => {
                  const items = entries.filter((e) => e.meal === m.value);
                  if (!items.length) return null;
                  return (
                    <Card key={m.value}>
                      <Text style={{ fontWeight: '700', color: colors.text }}>
                        {m.icon} {m.label} · {formatNumber(sumNutrients(items).kcal)} kcal
                      </Text>
                      {items.map((e) => (
                        <Row key={e.id} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
                          <Text style={{ color: colors.text, flex: 1 }}>
                            {e.foodName} <Text style={{ color: colors.textSecondary }}>· {formatNumber(e.quantity)} {e.unit}</Text>
                          </Text>
                          <Muted>
                            {formatNumber(e.kcal)} kcal · P {formatNumber(e.protein)}g
                          </Muted>
                        </Row>
                      ))}
                    </Card>
                  );
                })
              : foods.slice(0, 15).map((f) => (
                  <Row key={f.label} style={{ justifyContent: 'space-between', paddingVertical: space(2), borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.text, flex: 1 }}>{f.label}</Text>
                    <Muted>
                      {f.count}× · {formatNumber(Math.round(f.kcal))} kcal
                    </Muted>
                  </Row>
                ))}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// ===================== BODY =====================

export function BodyProgress() {
  const { data, profile, settings } = useData();
  const today = todayKey();
  const [period, setPeriod] = useState<Period>('week');
  const [kind, setKind] = useState<'bar' | 'line'>('line');
  const available = MEASURES.filter((m) => data.bodyLogs.some((b) => b.values[m.key]));
  const [measure, setMeasure] = useState<MeasureKey | null>(null);
  const key = measure ?? available[0]?.key ?? 'weight';
  const meta = MEASURES.find((m) => m.key === key)!;
  const unit = measureUnit(meta, settings.weightUnit, profile.lengthUnit);

  const keys = useMemo(() => recentBuckets(period, today, data.bodyLogs), [period, today, data.bodyLogs]);
  const values = useMemo(() => measureByPeriod(data.bodyLogs, key, period, keys), [data.bodyLogs, key, period, keys]);
  const [first, last] = firstAndLast(values);
  const history = [...data.bodyLogs].filter((b) => b.values[key]).sort((a, b) => (a.date < b.date ? 1 : -1));

  if (available.length === 0) {
    return <Empty title="No measurements yet" body="Add your weight and body measurements on Today → Body to track them over time." />;
  }

  return (
    <>
      <PeriodPicker value={period} onChange={setPeriod} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space(1) }}>
        {available.map((m) => (
          <Chip key={m.key} label={m.label} selected={m.key === key} onPress={() => setMeasure(m.key)} />
        ))}
      </ScrollView>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{meta.label}</Text>
        {first !== null && last !== null ? (
          <Row style={{ flexWrap: 'wrap' }}>
            <Muted>
              {formatNumber(first)} → {formatNumber(last)} {unit} in this range
            </Muted>
            <Delta diff={Math.round((last - first) * 10) / 10} pct={change(last, first).pct} unit={unit} higherIsBetter={!meta.lowerIsBetter} />
          </Row>
        ) : (
          <Muted>Not measured in this range.</Muted>
        )}
      </Card>
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: space(1) }}>
          <Text style={{ fontWeight: '600', color: colors.textSecondary }}>
            {meta.label} ({unit}), latest per {PERIODS.find((p) => p.value === period)?.noun}
          </Text>
          <KindToggle value={kind} onChange={setKind} />
        </Row>
        <Chart points={keys.map((k, i) => ({ label: bucketLabel(k, period), title: bucketTitle(k, period), value: values[i] }))} kind={kind} unit={unit} />
      </Card>

      <SectionHeader>All measurements: first → latest</SectionHeader>
      <Card>
        {available.map((m) => {
          const logs = [...data.bodyLogs].filter((b) => b.values[m.key]).sort((a, b) => (a.date < b.date ? -1 : 1));
          const a = logs[0].values[m.key]!;
          const b = logs[logs.length - 1].values[m.key]!;
          const u = measureUnit(m, settings.weightUnit, profile.lengthUnit);
          return (
            <Pressable key={m.key} onPress={() => setMeasure(m.key)}>
              <Row style={{ justifyContent: 'space-between', paddingVertical: space(1.5), borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: m.key === key ? '700' : '400', flex: 1 }}>{m.label}</Text>
                <Muted>
                  {formatNumber(a)} → {formatNumber(b)} {u}
                </Muted>
                <View style={{ width: 92, alignItems: 'flex-end' }}>
                  {logs.length > 1 ? <Delta diff={Math.round((b - a) * 10) / 10} pct={null} unit={u} higherIsBetter={!m.lowerIsBetter} compact /> : <Muted>1 entry</Muted>}
                </View>
              </Row>
            </Pressable>
          );
        })}
        <Muted style={{ marginTop: space(2) }}>Green = moving in the usual goal direction (waist, stomach and body fat down; everything else up).</Muted>
      </Card>

      <SectionHeader>{meta.label} history</SectionHeader>
      {history.slice(0, 20).map((b, i) => {
        const prev = history[i + 1]?.values[key];
        const v = b.values[key]!;
        return (
          <Row key={b.id} style={{ justifyContent: 'space-between', paddingVertical: space(2), borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.text }}>{formatDate(b.date)}</Text>
            <Row>
              <Text style={{ color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                {formatNumber(v)} {unit}
              </Text>
              {prev ? <Delta diff={Math.round((v - prev) * 10) / 10} pct={null} unit={unit} higherIsBetter={!meta.lowerIsBetter} compact /> : null}
            </Row>
          </Row>
        );
      })}
    </>
  );
}
