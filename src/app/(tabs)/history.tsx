import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useData } from '../../data/DataProvider';
import { colors, space } from '../../components/theme';
import { Card, Empty, Field, Muted, Row, Screen, SectionHeader, Stat } from '../../components/ui';
import { formatDate } from '../../lib/date';
import { formatNumber, summarizeSession } from '../../lib/stats';

export default function HistoryScreen() {
  const { data, exerciseById, settings } = useData();
  const [query, setQuery] = useState('');

  const sessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.sessions
      .filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.entries.some((e) => exerciseById(e.exerciseId)?.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => (a.date + a.startedAt < b.date + b.startedAt ? 1 : -1));
  }, [data.sessions, query, exerciseById]);

  const totals = useMemo(
    () =>
      data.sessions.reduce(
        (acc, s) => {
          const sum = summarizeSession(s);
          return { workouts: acc.workouts + 1, sets: acc.sets + sum.sets, reps: acc.reps + sum.reps, volume: acc.volume + sum.volume };
        },
        { workouts: 0, sets: 0, reps: 0, volume: 0 },
      ),
    [data.sessions],
  );

  return (
    <Screen>
      <Card>
        <Muted>All-time totals</Muted>
        <Row>
          <Stat label="Workouts" value={String(totals.workouts)} />
          <Stat label="Sets" value={formatNumber(totals.sets)} />
          <Stat label="Reps" value={formatNumber(totals.reps)} />
          <Stat label={`Lifted (${settings.weightUnit})`} value={formatNumber(totals.volume)} />
        </Row>
      </Card>
      <Field placeholder="Search by workout or exercise…" value={query} onChangeText={setQuery} />

      {sessions.length === 0 ? <Empty title="No workouts logged" body="Start one from the Today tab." /> : null}

      {sessions.map((s, i) => {
        const sum = summarizeSession(s);
        const newMonth = i === 0 || sessions[i - 1].date.slice(0, 7) !== s.date.slice(0, 7);
        return (
          <React.Fragment key={s.id}>
            {newMonth ? (
              <SectionHeader>
                {new Date(`${s.date}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </SectionHeader>
            ) : null}
            <Pressable onPress={() => router.push(`/workout/${s.id}`)}>
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 1 }}>{s.title}</Text>
                  {!s.finishedAt ? <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>IN PROGRESS</Text> : null}
                </Row>
                <Muted>{formatDate(s.date)}</Muted>
                {s.entries.map((e) => {
                  const done = e.sets.filter((x) => x.completed && x.type !== 'warmup');
                  if (done.length === 0) return null;
                  return (
                    <Text key={e.id} style={{ fontSize: 13, color: colors.text, marginTop: space(1) }}>
                      <Text style={{ fontWeight: '600' }}>{exerciseById(e.exerciseId)?.name ?? 'Deleted exercise'}</Text>
                      {'  '}
                      <Text style={{ color: colors.textSecondary }}>
                        {done.map((x) => `${x.reps}×${x.weight}`).join(', ')}
                      </Text>
                    </Text>
                  );
                })}
                <Muted style={{ marginTop: space(2) }}>
                  {sum.exercises} exercise{sum.exercises === 1 ? '' : 's'} · {sum.sets} sets · {sum.reps} reps · {formatNumber(sum.volume)} {settings.weightUnit}
                </Muted>
              </Card>
            </Pressable>
          </React.Fragment>
        );
      })}
    </Screen>
  );
}
