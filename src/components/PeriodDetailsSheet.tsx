import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../data/DataProvider';
import { formatShortDate } from '../lib/date';
import { periodDetails } from '../lib/details';
import { bucketTitle, Period } from '../lib/periods';
import { formatNumber } from '../lib/stats';
import { Donut } from './Donut';
import { ExerciseImage } from './ExerciseImage';
import { SetChart } from './SetChart';
import { colors, space } from './theme';
import { Button, Card, Delta, Muted, Row, Segmented, Stat, styles } from './ui';

const NOUN: Record<Period, string> = { day: 'day', week: 'week', month: 'month', year: 'year' };

function Gain({ label, pct, help }: { label: string; pct: number | null; help: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 2 }}>
      <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>{label}</Text>
      {pct === null ? <Text style={{ color: colors.textMuted, fontSize: 13, marginVertical: 2 }}>—</Text> : <Delta diff={pct} pct={null} unit="%" compact />}
      <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center' }}>{help}</Text>
    </View>
  );
}

/** Bottom sheet with everything about one day / week / month / year. */
export function PeriodDetailsSheet({ period, bucket, onClose }: { period: Period; bucket: string | null; onClose: () => void }) {
  const { data, exerciseById, settings } = useData();
  const unit = settings.weightUnit;
  const [split, setSplit] = useState<'volume' | 'sets'>('volume');
  const details = useMemo(() => (bucket ? periodDetails(data.sessions, period, bucket) : null), [data.sessions, period, bucket]);

  const open = (sessionId: string) => {
    onClose();
    router.push(`/workout/${sessionId}`);
  };

  return (
    <Modal visible={!!bucket} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {details ? (
          <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(16), width: '100%', maxWidth: 760, alignSelf: 'center' }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
              <View style={{ flexShrink: 1 }}>
                <Muted>{period === 'day' ? 'Day' : `This ${NOUN[period]}`}</Muted>
                <Text style={styles.title}>{bucketTitle(details.key, period)}</Text>
              </View>
              <Button title="Close" variant="ghost" small onPress={onClose} />
            </Row>

            <Card>
              <Row>
                <Stat label="Workouts" value={String(details.totals.workouts)} />
                <Stat label="Sets" value={String(details.totals.sets)} />
                <Stat label="Reps" value={formatNumber(details.totals.reps)} />
                <Stat label={`Volume (${unit})`} value={formatNumber(details.totals.volume)} />
              </Row>
              <Muted style={{ textAlign: 'center' }}>
                Efficiency: {formatNumber(details.totals.efficiency)} {unit} per working set
              </Muted>
            </Card>

            {details.previousKey ? (
              <Card>
                <Text style={{ fontWeight: '700', color: colors.text, marginBottom: space(2) }}>
                  vs {period === 'day' ? 'previous workout day' : `previous ${NOUN[period]}`} ({bucketTitle(details.previousKey, period)})
                </Text>
                <Row style={{ alignItems: 'flex-start' }}>
                  <Gain label="Strength gain" pct={details.strengthGainPct} help="avg est. 1RM change" />
                  <Gain label="Power gain" pct={details.powerGainPct} help="volume change" />
                  <Gain label="Efficiency" pct={details.efficiencyChangePct} help={`${unit} per set change`} />
                </Row>
              </Card>
            ) : (
              <Muted style={{ marginBottom: space(3) }}>No earlier {NOUN[period]} to compare with yet.</Muted>
            )}

            <Card>
              <Text style={{ fontWeight: '700', color: colors.text, marginBottom: space(2) }}>Workouts</Text>
              {details.sessions.map((s) => (
                <Pressable key={s.id} onPress={() => open(s.id)}>
                  <Row style={{ justifyContent: 'space-between', paddingVertical: space(1.5) }}>
                    <Text style={{ color: colors.accent, fontWeight: '600', flexShrink: 1 }}>{s.title}</Text>
                    <Muted>{formatShortDate(s.date)} ›</Muted>
                  </Row>
                </Pressable>
              ))}
            </Card>

            <Card>
              <Text style={{ fontWeight: '700', color: colors.text, marginBottom: space(2) }}>Split by exercise</Text>
              <Segmented<'volume' | 'sets'>
                options={[
                  { value: 'volume', label: `Volume (${unit})` },
                  { value: 'sets', label: 'Sets' },
                ]}
                value={split}
                onChange={setSplit}
              />
              <Donut
                slices={details.exercises
                  .map((e) => ({ key: e.exerciseId, label: exerciseById(e.exerciseId)?.name ?? 'Deleted exercise', value: split === 'volume' ? e.volume : e.sets }))
                  .sort((a, b) => b.value - a.value)}
                unit={split === 'volume' ? unit : 'sets'}
                centerLabel={split === 'volume' ? `${unit} total` : 'sets total'}
              />
            </Card>

            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginVertical: space(2) }}>Every exercise</Text>
            {details.exercises.map((e) => {
              const ex = exerciseById(e.exerciseId);
              return (
                <Card key={e.exerciseId}>
                  <Row style={{ alignItems: 'flex-start' }}>
                    <ExerciseImage exercise={ex} size={52} />
                    <View style={{ flex: 1 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 }}>{ex?.name ?? 'Deleted exercise'}</Text>
                        {e.strengthChangePct !== null ? <Delta diff={e.strengthChangePct} pct={null} unit="%" compact /> : null}
                      </Row>
                      <Muted>
                        {e.sets} sets · {e.reps} reps · {formatNumber(e.volume)} {unit}
                        {e.best1RM ? ` · est. 1RM ${formatNumber(e.best1RM)} ${unit}` : ''}
                        {e.sessions > 1 ? ` · ${e.sessions} sessions` : ''}
                      </Muted>
                    </View>
                  </Row>
                  <View style={{ marginTop: space(2) }}>
                    {period !== 'day' ? <Muted>Latest: {formatShortDate(e.latest.date)}</Muted> : null}
                    <SetChart sets={e.latest.sets} unit={unit} timed={ex?.measure === 'time'} compact />
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
