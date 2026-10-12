import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useData } from '../../data/DataProvider';
import { Chart, ChartPoint } from '../../components/Chart';
import { ExercisePicker } from '../../components/ExercisePicker';
import { colors, space } from '../../components/theme';
import { Button, Card, Chip, Delta, Empty, Muted, Row, Screen, SectionHeader, Segmented, Stat } from '../../components/ui';
import { formatDate, todayKey } from '../../lib/date';
import {
  bucketLabel,
  bucketTitle,
  change,
  exerciseByPeriod,
  firstAndLast,
  overviewByPeriod,
  Period,
  PERIODS,
  recentBuckets,
} from '../../lib/periods';
import { exerciseHistory, exerciseRecords, formatNumber } from '../../lib/stats';

type View_ = 'overview' | 'exercise';
type OverviewMetric = 'volume' | 'workouts' | 'reps' | 'sets';
type ExerciseMetric = 'best1RM' | 'topWeight' | 'volume' | 'reps';

const CURRENT_LABEL: Record<Period, string> = { day: 'Today', week: 'This week', month: 'This month', year: 'This year' };
const COMPARE_LABEL: Record<Period, string> = {
  day: 'Yesterday vs the day before',
  week: 'Last week vs the week before',
  month: 'Last month vs the month before',
  year: 'Last year vs the year before',
};

export default function ProgressScreen() {
  const { data, exerciseById, settings } = useData();
  const unit = settings.weightUnit;
  const today = todayKey();
  const [view, setView] = useState<View_>('overview');
  const [period, setPeriod] = useState<Period>('week');
  const [overviewMetric, setOverviewMetric] = useState<OverviewMetric>('volume');
  const [exMetric, setExMetric] = useState<ExerciseMetric>('best1RM');
  const [picker, setPicker] = useState(false);
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const finished = useMemo(() => data.sessions.filter((s) => s.finishedAt), [data.sessions]);
  const keys = useMemo(() => recentBuckets(period, today, finished), [period, today, finished]);
  const periodNoun = PERIODS.find((p) => p.value === period)!.noun;

  // Exercises with history, most-logged first.
  const loggedExercises = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of finished)
      for (const e of s.entries) if (e.sets.some((x) => x.completed)) counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => exerciseById(id));
  }, [finished, exerciseById]);
  const selectedExercise = exerciseId ?? loggedExercises[0] ?? null;

  // ----- Overview -----
  const overview = useMemo(() => overviewByPeriod(finished, period, keys), [finished, period, keys]);
  // Compare the last two *completed* periods; the current one is still in progress.
  const current = overview[overview.length - 1];
  const cur = overview[overview.length - 2];
  const prev = overview[overview.length - 3];
  const overviewPoints: ChartPoint[] = overview.map((b) => ({
    label: bucketLabel(b.key, period),
    title: bucketTitle(b.key, period),
    value: b[overviewMetric],
    detail: b.workouts ? `${b.workouts} workout${b.workouts === 1 ? '' : 's'}` : undefined,
  }));

  // Strength trend per exercise across the visible range (first vs latest best est. 1RM).
  const strength = useMemo(
    () =>
      loggedExercises
        .map((id) => {
          const buckets = exerciseByPeriod(finished, id, period, keys);
          const [first, last] = firstAndLast(buckets.map((b) => b.best1RM));
          const trained = buckets.filter((b) => b.sessions > 0).length;
          return { id, first, last, trained };
        })
        .filter((x) => x.first !== null && x.last !== null && x.trained >= 1)
        .map((x) => ({ ...x, c: change(x.last as number, x.first as number) }))
        .sort((a, b) => (b.c.pct ?? 0) - (a.c.pct ?? 0)),
    [loggedExercises, finished, period, keys],
  );

  // ----- Exercise -----
  const exBuckets = useMemo(
    () => (selectedExercise ? exerciseByPeriod(finished, selectedExercise, period, keys) : []),
    [finished, selectedExercise, period, keys],
  );
  const exValues = exBuckets.map((b) => (exMetric === 'volume' || exMetric === 'reps' ? (b.sessions ? b[exMetric] : null) : b[exMetric]));
  const exPoints: ChartPoint[] = exBuckets.map((b, i) => ({
    label: bucketLabel(b.key, period),
    title: bucketTitle(b.key, period),
    value: exValues[i],
    detail: b.sessions ? `${b.sessions} session${b.sessions === 1 ? '' : 's'}` : 'not trained',
  }));
  const [exFirst, exLast] = firstAndLast(exValues);
  const firstKey = exBuckets.find((_, i) => exValues[i] !== null && (exValues[i] as number) > 0)?.key;
  const records = useMemo(
    () => (selectedExercise ? exerciseRecords(exerciseHistory(finished, selectedExercise), finished, selectedExercise) : null),
    [finished, selectedExercise],
  );
  const recent = useMemo(
    () => (selectedExercise ? exerciseHistory(finished, selectedExercise).slice(-10).reverse() : []),
    [finished, selectedExercise],
  );

  const exMetricMeta: Record<ExerciseMetric, { label: string; title: string; unit: string; kind: 'line' | 'bar' }> = {
    best1RM: { label: 'Strength (1RM)', title: `Estimated 1-rep max (${unit}), best per ${periodNoun}`, unit, kind: 'line' },
    topWeight: { label: 'Heaviest set', title: `Heaviest weight lifted (${unit}), per ${periodNoun}`, unit, kind: 'line' },
    volume: { label: 'Volume', title: `Total volume (${unit}), per ${periodNoun}`, unit, kind: 'bar' },
    reps: { label: 'Reps', title: `Total reps, per ${periodNoun}`, unit: 'reps', kind: 'bar' },
  };
  const overviewMeta: Record<OverviewMetric, { label: string; title: string; unit: string }> = {
    volume: { label: 'Volume', title: `Weight lifted (${unit}) per ${periodNoun}`, unit },
    workouts: { label: 'Workouts', title: `Workouts per ${periodNoun}`, unit: '' },
    reps: { label: 'Reps', title: `Reps per ${periodNoun}`, unit: 'reps' },
    sets: { label: 'Sets', title: `Working sets per ${periodNoun}`, unit: 'sets' },
  };

  if (finished.length === 0) {
    return (
      <Screen>
        <Empty
          title="Your progress will show up here"
          body="Finish your first workout and you'll see charts of your volume and strength by week, month and year."
          action={<Button title="Go to Today" onPress={() => router.push('/')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Segmented<View_>
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'exercise', label: 'By exercise' },
        ]}
        value={view}
        onChange={setView}
      />
      <Segmented<Period> options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} value={period} onChange={setPeriod} />

      {view === 'overview' ? (
        <>
          <Card>
            <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{COMPARE_LABEL[period]}</Text>
            <Row style={{ marginTop: space(2), alignItems: 'flex-start' }}>
              {(
                [
                  ['workouts', 'Workouts'],
                  ['volume', `Volume (${unit})`],
                  ['sets', 'Sets'],
                ] as [OverviewMetric, string][]
              ).map(([m, label]) => {
                const c = change(cur?.[m] ?? 0, prev?.[m] ?? 0);
                return (
                  <View key={m} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatNumber(c.current)}</Text>
                    <Muted>{label}</Muted>
                    <Delta diff={c.diff} pct={c.pct} compact />
                  </View>
                );
              })}
            </Row>
            <Muted style={{ marginTop: space(3) }}>
              {CURRENT_LABEL[period]} so far: {current?.workouts ?? 0} workout{current?.workouts === 1 ? '' : 's'} ·{' '}
              {formatNumber(current?.volume ?? 0)} {unit}
            </Muted>
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(Object.keys(overviewMeta) as OverviewMetric[]).map((m) => (
              <Chip key={m} label={overviewMeta[m].label} selected={overviewMetric === m} onPress={() => setOverviewMetric(m)} />
            ))}
          </View>
          <Card>
            <Text style={{ fontWeight: '600', color: colors.textSecondary, marginBottom: space(1) }}>{overviewMeta[overviewMetric].title}</Text>
            <Chart points={overviewPoints} kind="bar" unit={overviewMeta[overviewMetric].unit} />
            <Muted style={{ marginTop: space(1) }}>Tap a bar to see that {periodNoun}.</Muted>
          </Card>

          <SectionHeader>Strength change in this range</SectionHeader>
          {strength.length === 0 ? <Muted>Train an exercise to see its trend.</Muted> : null}
          {strength.slice(0, 8).map(({ id, first, last, c }) => (
            <Pressable
              key={id}
              onPress={() => {
                setExerciseId(id);
                setView('exercise');
              }}
            >
              <Card style={{ paddingVertical: space(3) }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{exerciseById(id)?.name}</Text>
                    <Muted>
                      Est. 1RM {formatNumber(first as number)} → {formatNumber(last as number)} {unit}
                    </Muted>
                  </View>
                  <Delta diff={c.diff} pct={c.pct} unit={unit} />
                </Row>
              </Card>
            </Pressable>
          ))}
        </>
      ) : !selectedExercise ? (
        <Empty title="No exercise history yet" body="Finish a workout to see progress per exercise." />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space(1) }}>
            {loggedExercises.map((id) => (
              <Chip key={id} label={exerciseById(id)?.name ?? '?'} selected={id === selectedExercise} onPress={() => setExerciseId(id)} />
            ))}
            <Chip label="All exercises…" onPress={() => setPicker(true)} />
          </ScrollView>

          <Card>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{exerciseById(selectedExercise)?.name}</Text>
            {exFirst !== null && exLast !== null && firstKey ? (
              <Row style={{ marginTop: space(1), flexWrap: 'wrap' }}>
                <Muted>
                  {exMetricMeta[exMetric].label}: {formatNumber(exFirst)} → {formatNumber(exLast)} {exMetricMeta[exMetric].unit} since{' '}
                  {bucketTitle(firstKey, period)}
                </Muted>
                <Delta diff={exLast - exFirst} pct={change(exLast, exFirst).pct} unit={exMetricMeta[exMetric].unit} />
              </Row>
            ) : (
              <Muted>Not trained in this range.</Muted>
            )}
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(Object.keys(exMetricMeta) as ExerciseMetric[]).map((m) => (
              <Chip key={m} label={exMetricMeta[m].label} selected={exMetric === m} onPress={() => setExMetric(m)} />
            ))}
          </View>
          <Card>
            <Text style={{ fontWeight: '600', color: colors.textSecondary, marginBottom: space(1) }}>{exMetricMeta[exMetric].title}</Text>
            <Chart points={exPoints} kind={exMetricMeta[exMetric].kind} unit={exMetricMeta[exMetric].unit} />
            {exMetric === 'best1RM' ? (
              <Muted style={{ marginTop: space(1) }}>
                Estimated 1RM combines weight and reps (Epley formula), so it rises whether you add weight or reps.
              </Muted>
            ) : null}
          </Card>

          {records ? (
            <Card>
              <Muted>Personal records (all time)</Muted>
              <Row>
                <Stat label={`Heaviest (${unit})`} value={formatNumber(records.maxWeight)} />
                <Stat label={`Best 1RM (${unit})`} value={formatNumber(records.best1RM)} />
                <Stat label="Most reps" value={String(records.maxReps)} />
              </Row>
              <Row>
                <Stat label="Sessions" value={String(records.sessions)} />
                <Stat label="Total reps" value={formatNumber(records.totalReps)} />
                <Stat label={`Total lifted (${unit})`} value={formatNumber(records.totalVolume)} />
              </Row>
            </Card>
          ) : null}

          <SectionHeader>Recent sessions</SectionHeader>
          {recent.map((p) => (
            <Pressable key={p.sessionId} onPress={() => router.push(`/workout/${p.sessionId}`)}>
              <Row style={{ justifyContent: 'space-between', paddingVertical: space(2.5), borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text }}>{formatDate(p.date)}</Text>
                <Text style={{ color: colors.textSecondary, fontVariant: ['tabular-nums'] }}>
                  {p.sets} sets · best {p.topReps}×{p.topWeight} {unit}
                </Text>
              </Row>
            </Pressable>
          ))}
        </>
      )}
      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onSelect={setExerciseId} />
    </Screen>
  );
}
