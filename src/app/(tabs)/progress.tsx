import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '../../data/DataProvider';
import { Chart, ChartPoint } from '../../components/Chart';
import { ExercisePicker } from '../../components/ExercisePicker';
import { colors, space } from '../../components/theme';
import { Button, Card, Chip, Empty, Muted, Row, Screen, SectionHeader, Stat } from '../../components/ui';
import { addDays, formatDate, todayKey } from '../../lib/date';
import { dailyTotals, exerciseHistory, exerciseRecords, formatNumber } from '../../lib/stats';

type Range = '30' | '90' | '365' | 'all';
const RANGES: { value: Range; label: string }[] = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'all', label: 'All time' },
];

type DailyMetric = 'volume' | 'reps' | 'sets';
type ExerciseMetric = 'topWeight' | 'best1RM' | 'volume' | 'reps';

export default function ProgressScreen() {
  const { data, exerciseById, settings } = useData();
  const unit = settings.weightUnit;
  const [view, setView] = useState<'daily' | 'exercise'>('daily');
  const [range, setRange] = useState<Range>('90');
  const [dailyMetric, setDailyMetric] = useState<DailyMetric>('volume');
  const [exMetric, setExMetric] = useState<ExerciseMetric>('topWeight');
  const [picker, setPicker] = useState(false);

  const sessions = useMemo(() => {
    if (range === 'all') return data.sessions;
    const from = addDays(todayKey(), -Number(range));
    return data.sessions.filter((s) => s.date >= from);
  }, [data.sessions, range]);

  // Exercises with history, most-logged first.
  const loggedExercises = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of data.sessions)
      for (const e of s.entries) if (e.sets.some((x) => x.completed)) counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => exerciseById(id));
  }, [data.sessions, exerciseById]);

  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const selectedExercise = exerciseId ?? loggedExercises[0] ?? null;

  const daily = useMemo(() => dailyTotals(sessions), [sessions]);
  const dailyPoints: ChartPoint[] = daily.map((d) => ({
    date: d.date,
    value: d[dailyMetric],
    detail: `${d.sets} sets · ${d.reps} reps`,
  }));

  const exPoints = useMemo(() => (selectedExercise ? exerciseHistory(sessions, selectedExercise) : []), [sessions, selectedExercise]);
  const allTimeRecords = useMemo(
    () => (selectedExercise ? exerciseRecords(exerciseHistory(data.sessions, selectedExercise), data.sessions, selectedExercise) : null),
    [data.sessions, selectedExercise],
  );
  const exChart: ChartPoint[] = exPoints.map((p) => ({
    date: p.date,
    value: p[exMetric],
    detail: `best ${p.topReps}×${p.topWeight} ${unit}`,
  }));

  return (
    <Screen>
      <Row style={{ marginBottom: space(3) }}>
        <Button title="Daily" variant={view === 'daily' ? 'primary' : 'secondary'} onPress={() => setView('daily')} style={{ flex: 1 }} />
        <Button title="By exercise" variant={view === 'exercise' ? 'primary' : 'secondary'} onPress={() => setView('exercise')} style={{ flex: 1 }} />
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {RANGES.map((r) => (
          <Chip key={r.value} label={r.label} selected={range === r.value} onPress={() => setRange(r.value)} />
        ))}
      </View>

      {view === 'daily' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(
              [
                ['volume', `Volume (${unit})`],
                ['reps', 'Reps'],
                ['sets', 'Sets'],
              ] as [DailyMetric, string][]
            ).map(([m, label]) => (
              <Chip key={m} label={label} selected={dailyMetric === m} onPress={() => setDailyMetric(m)} />
            ))}
          </View>
          <Card>
            <Text style={{ fontWeight: '600', color: colors.text, marginBottom: space(2) }}>
              {dailyMetric === 'volume' ? `Daily volume lifted (${unit})` : dailyMetric === 'reps' ? 'Daily reps' : 'Daily working sets'}
            </Text>
            <Chart points={dailyPoints} kind="bar" unit={dailyMetric === 'volume' ? unit : dailyMetric} />
          </Card>
          <Card>
            <Row>
              <Stat label="Training days" value={String(daily.length)} />
              <Stat label="Sets" value={formatNumber(daily.reduce((a, d) => a + d.sets, 0))} />
              <Stat label="Reps" value={formatNumber(daily.reduce((a, d) => a + d.reps, 0))} />
              <Stat label={`Lifted (${unit})`} value={formatNumber(daily.reduce((a, d) => a + d.volume, 0))} />
            </Row>
          </Card>
          <SectionHeader>Day by day</SectionHeader>
          {daily.length === 0 ? <Empty title="Nothing logged in this range" /> : null}
          {daily
            .slice()
            .reverse()
            .map((d) => (
              <Row key={d.date} style={{ justifyContent: 'space-between', paddingVertical: space(2), borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text }}>{formatDate(d.date)}</Text>
                <Text style={{ color: colors.textSecondary, fontVariant: ['tabular-nums'] }}>
                  {d.sets} sets · {d.reps} reps · {formatNumber(d.volume)} {unit}
                </Text>
              </Row>
            ))}
        </>
      ) : (
        <>
          {loggedExercises.length === 0 ? (
            <Empty title="No exercise history yet" body="Finish a workout to see progress per exercise." />
          ) : (
            <>
              <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, flexShrink: 1 }}>
                  {selectedExercise ? exerciseById(selectedExercise)?.name : ''}
                </Text>
                <Button title="Change" small variant="secondary" onPress={() => setPicker(true)} />
              </Row>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {loggedExercises.slice(0, 8).map((id) => (
                  <Chip key={id} label={exerciseById(id)?.name ?? '?'} selected={id === selectedExercise} onPress={() => setExerciseId(id)} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {(
                  [
                    ['topWeight', 'Top weight'],
                    ['best1RM', 'Est. 1RM'],
                    ['volume', 'Volume'],
                    ['reps', 'Reps'],
                  ] as [ExerciseMetric, string][]
                ).map(([m, label]) => (
                  <Chip key={m} label={label} selected={exMetric === m} onPress={() => setExMetric(m)} />
                ))}
              </View>
              <Card>
                <Text style={{ fontWeight: '600', color: colors.text, marginBottom: space(2) }}>
                  {{ topWeight: `Heaviest set per session (${unit})`, best1RM: `Estimated 1-rep max (${unit})`, volume: `Volume per session (${unit})`, reps: 'Total reps per session' }[exMetric]}
                </Text>
                <Chart points={exChart} kind="line" unit={exMetric === 'reps' ? 'reps' : unit} />
              </Card>
              {allTimeRecords ? (
                <Card>
                  <Muted>All-time records</Muted>
                  <Row>
                    <Stat label={`Max weight (${unit})`} value={formatNumber(allTimeRecords.maxWeight)} />
                    <Stat label={`Best 1RM (${unit})`} value={formatNumber(allTimeRecords.best1RM)} />
                    <Stat label="Max reps" value={String(allTimeRecords.maxReps)} />
                  </Row>
                  <Row>
                    <Stat label="Sessions" value={String(allTimeRecords.sessions)} />
                    <Stat label="Total reps" value={formatNumber(allTimeRecords.totalReps)} />
                    <Stat label={`Total lifted (${unit})`} value={formatNumber(allTimeRecords.totalVolume)} />
                  </Row>
                </Card>
              ) : null}
              <SectionHeader>Session log</SectionHeader>
              {exPoints.length === 0 ? <Muted>No sessions in this range.</Muted> : null}
              {exPoints
                .slice()
                .reverse()
                .map((p) => (
                  <Pressable key={p.sessionId} onPress={() => router.push(`/workout/${p.sessionId}`)}>
                    <Row style={{ justifyContent: 'space-between', paddingVertical: space(2), borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ color: colors.text }}>{formatDate(p.date)}</Text>
                      <Text style={{ color: colors.textSecondary, fontVariant: ['tabular-nums'] }}>
                        {p.sets}×, best {p.topReps}×{p.topWeight} · 1RM {formatNumber(p.best1RM)}
                      </Text>
                    </Row>
                  </Pressable>
                ))}
            </>
          )}
        </>
      )}
      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onSelect={setExerciseId} />
    </Screen>
  );
}
