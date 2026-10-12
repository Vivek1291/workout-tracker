import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '../../data/DataProvider';
import { confirm } from '../../components/confirm';
import { colors, space } from '../../components/theme';
import { Button, Card, Empty, Muted, Row, Screen, SectionHeader } from '../../components/ui';
import { WEEKDAYS_SHORT } from '../../lib/date';
import { newId, nowIso } from '../../lib/id';
import { newPlan } from '../../lib/plan';
import { buildPplPlan } from '../../data/templates';
import { PlanMode, WorkoutPlan } from '../../types';

export default function PlansScreen() {
  const { data, savePlan, deletePlan, setActivePlan, exerciseById } = useData();

  const create = async (mode: PlanMode) => {
    const plan = newPlan(mode);
    if (!data.plans.some((p) => p.isActive)) plan.isActive = true;
    await savePlan(plan);
    router.push(`/plan/${plan.id}`);
  };

  const duplicate = async (p: WorkoutPlan) => {
    const now = nowIso();
    const copy: WorkoutPlan = {
      ...JSON.parse(JSON.stringify(p)),
      id: newId(),
      name: `${p.name} (copy)`,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
    copy.days = copy.days.map((d) => ({ ...d, id: newId(), exercises: d.exercises.map((e) => ({ ...e, id: newId() })) }));
    await savePlan(copy);
  };

  return (
    <Screen>
      <Row style={{ marginBottom: space(2) }}>
        <Button title="+ Weekly plan" onPress={() => create('weekly')} style={{ flex: 1 }} />
        <Button title="+ Rotation (N-day)" variant="secondary" onPress={() => create('cycle')} style={{ flex: 1 }} />
      </Row>
      <Button
        title="+ Add 6-day Push / Pull / Legs template"
        variant="secondary"
        onPress={async () => {
          const plan = buildPplPlan(data.exercises);
          if (data.plans.some((p) => p.id === plan.id)) plan.id = newId();
          plan.isActive = !data.plans.some((p) => p.isActive);
          await savePlan(plan);
          router.push(`/plan/${plan.id}`);
        }}
        style={{ marginBottom: space(2) }}
      />
      <Muted>
        Weekly plans map workouts to Mon–Sun. Rotations (e.g. Push / Pull / Legs / Rest) repeat every N days from a start
        date. Both repeat forever.
      </Muted>

      <SectionHeader>Your plans</SectionHeader>
      {data.plans.length === 0 ? <Empty title="No plans yet" body="Create one above to get started." /> : null}
      {data.plans
        .slice()
        .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name))
        .map((p) => (
          <Card key={p.id} style={p.isActive ? { borderColor: colors.accent, borderWidth: 1 } : undefined}>
            <Pressable onPress={() => router.push(`/plan/${p.id}`)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1 }}>{p.name}</Text>
                {p.isActive ? (
                  <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 12 }}>ACTIVE</Text>
                ) : null}
              </Row>
              <Muted>
                {p.mode === 'weekly' ? 'Weekly' : `${p.days.length}-day rotation`} ·{' '}
                {p.days.filter((d) => !d.isRest).length} training days
              </Muted>
              <View style={{ marginTop: space(2) }}>
                {p.days.map((d, i) => (
                  <Row key={d.id} style={{ paddingVertical: 2, alignItems: 'flex-start' }}>
                    <Text style={{ width: 44, color: colors.textSecondary, fontSize: 13 }}>
                      {p.mode === 'weekly' ? WEEKDAYS_SHORT[i] : `D${i + 1}`}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 13, color: d.isRest ? colors.rest : colors.text }}>
                      {d.isRest
                        ? 'Rest'
                        : `${d.label || 'Workout'}${
                            d.exercises.length
                              ? ` — ${d.exercises.map((e) => exerciseById(e.exerciseId)?.name ?? '?').join(', ')}`
                              : ''
                          }`}
                    </Text>
                  </Row>
                ))}
              </View>
            </Pressable>
            <Row style={{ marginTop: space(3), flexWrap: 'wrap' }}>
              <Button title="Edit" small onPress={() => router.push(`/plan/${p.id}`)} />
              {!p.isActive ? <Button title="Set active" small variant="secondary" onPress={() => setActivePlan(p.id)} /> : null}
              <Button title="Duplicate" small variant="secondary" onPress={() => duplicate(p)} />
              <Button
                title="Delete"
                small
                variant="danger"
                onPress={async () => {
                  if (await confirm('Delete plan?', `"${p.name}" will be removed. Logged workouts are kept.`)) deletePlan(p.id);
                }}
              />
            </Row>
          </Card>
        ))}
    </Screen>
  );
}
